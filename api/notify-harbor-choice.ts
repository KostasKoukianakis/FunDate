/**
 * Vercel Serverless — sends you an email when someone confirms «I'm sure» with their harbor choice.
 * Uses the official Resend SDK (`resend` package). API key only via env — never commit keys.
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 * - RESEND_API_KEY — https://resend.com/api-keys
 * - NOTIFY_FROM_EMAIL — optional; defaults to `onboarding@resend.dev` (Resend test sender; use your verified domain in production)
 * - NOTIFY_TO_EMAIL — optional; defaults to kostaskoukianakis72@gmail.com if unset
 * - NOTIFY_ALLOWED_ORIGINS — optional comma list; if set, only these Origins may POST
 * - NOTIFY_CHOOSER_NAME — optional; used in the email if the POST body omits `chooserName` (e.g. Electra)
 *
 * Guest IP in the email is taken from `x-forwarded-for` / Vercel edge headers (best-effort, may be a proxy or mobile NAT).
 *
 * Node: set Project → Settings → General → Node.js Version to **20.x** (the `resend` package requires Node ≥ 20).
 */

import { Resend } from "resend";

const CHOICES = ["shore", "feast", "drift"] as const;
type Choice = (typeof CHOICES)[number];

const LABELS: Record<Choice, string> = {
  shore: "Shore — outside / meet at the harbor",
  feast: "Feast — another night in",
  drift: "Drift — ask me again later",
};

/** Same order as the on-screen list (1st / 2nd / 3rd option). */
const OPTION_INDEX: Record<Choice, 1 | 2 | 3> = {
  shore: 1,
  feast: 2,
  drift: 3,
};

const OPTION_TITLE: Record<Choice, string> = {
  shore: "Let's meet outside",
  feast: "Another night in",
  drift: "Ask me again later",
};

function ordinal(n: 1 | 2 | 3): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : "3rd";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe one-line snippet for email subject (no newlines / angle brackets). */
function subjectSnippet(s: string): string {
  const t = s.replace(/[\r\n<>]/g, "").trim().slice(0, 60);
  return t.length > 0 ? t : "Your guest";
}

function pickChooserName(body: unknown): string {
  const fromPost =
    body && typeof body === "object" && body !== null && "chooserName" in body
      ? (body as { chooserName: unknown }).chooserName
      : undefined;
  if (typeof fromPost === "string") {
    const t = fromPost.trim().replace(/\s+/g, " ").slice(0, 80);
    if (t.length > 0) return t;
  }
  const fromEnv = process.env.NOTIFY_CHOOSER_NAME?.trim().replace(/\s+/g, " ").slice(0, 80);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return "Your guest";
}

/** Best-effort client IP from edge / proxy headers (Vercel sets these); not cryptographically verified. */
function guestIpFromRequest(req: Request): string {
  const firstHop = (value: string | null): string | undefined => {
    if (!value) return undefined;
    const part = value.split(",")[0]?.trim();
    if (!part || part.length > 128) return undefined;
    if (/[\r\n<>]/.test(part)) return undefined;
    return part;
  };

  return (
    firstHop(req.headers.get("x-forwarded-for")) ??
    firstHop(req.headers.get("x-vercel-forwarded-for")) ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

const DEFAULT_TO = "kostaskoukianakis72@gmail.com";
/** Resend’s shared test inbox; only works with `onboarding@resend.dev` and Resend’s rules. Use your domain sender in production. */
const DEFAULT_FROM = "onboarding@resend.dev";

function isChoice(x: unknown): x is Choice {
  return typeof x === "string" && (CHOICES as readonly string[]).includes(x);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * Vercel Node functions expect a Web handler on `fetch` (not a bare default function).
 * @see https://vercel.com/docs/functions/runtimes/node-js
 */
async function handleRequest(req: Request): Promise<Response> {
  const baseHeaders = { ...corsHeaders(), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  /** Γρήγορο έλεγχο από browser / curl: GET https://…/api/notify-harbor-choice */
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        route: "notify-harbor-choice",
        hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
      }),
      { status: 200, headers: baseHeaders },
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: baseHeaders,
    });
  }

  const allowed = process.env.NOTIFY_ALLOWED_ORIGINS?.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (allowed && allowed.length > 0) {
    const origin = req.headers.get("origin");
    /* Μόνο όταν υπάρχει Origin (π.χ. browser)· αλλιώς same-origin / curl δεν μπλοκάρονται λάθος. */
    if (origin && !allowed.some((o: string) => origin === o)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: baseHeaders,
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: baseHeaders,
    });
  }

  const choice =
    body && typeof body === "object" && body !== null && "choice" in body
      ? (body as { choice: unknown }).choice
      : null;
  if (!isChoice(choice)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid choice" }), {
      status: 400,
      headers: baseHeaders,
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFY_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const to = process.env.NOTIFY_TO_EMAIL?.trim() || DEFAULT_TO;

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "Server not configured" }), {
      status: 503,
      headers: baseHeaders,
    });
  }

  const chooser = pickChooserName(body);
  const chooserSubject = subjectSnippet(chooser);
  const guestIp = guestIpFromRequest(req);
  const n = OPTION_INDEX[choice];
  const ord = ordinal(n);
  const title = OPTION_TITLE[choice];
  const label = LABELS[choice];
  const subject = `Date Idea — ${chooserSubject} chose the ${ord} option`;
  const html = `<p><strong>${escapeHtml(chooser)}</strong> chose the <strong>${ord} option</strong> — ${escapeHtml(title)}.</p>
<p style="color:#444;font-size:14px;margin:12px 0 0 0">${escapeHtml(label)}</p>
<p style="color:#333;font-size:13px;margin:12px 0 0 0"><strong>Guest IP:</strong> ${escapeHtml(guestIp)}</p>
<p style="color:#666;font-size:12px;margin:16px 0 0 0"><code>${choice}</code> · ${new Date().toISOString()}</p>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[notify-harbor-choice] Resend:", error.name, error.message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Email provider error",
        detail: error.message,
        code: error.name,
      }),
      { status: 502, headers: baseHeaders },
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: baseHeaders });
}

export default {
  fetch: handleRequest,
};
