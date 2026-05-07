/**
 * Vercel Serverless — sends you an email when someone confirms «I'm sure» with their harbor choice.
 * Uses the official Resend SDK (`resend` package). API key only via env — never commit keys.
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 * - RESEND_API_KEY — https://resend.com/api-keys
 * - NOTIFY_FROM_EMAIL — optional; defaults to `onboarding@resend.dev` (Resend test sender; use your verified domain in production)
 * - NOTIFY_TO_EMAIL — optional; defaults to kostaskoukianakis72@gmail.com if unset
 * - NOTIFY_ALLOWED_ORIGINS — optional comma list; if set, only these Origins may POST
 */

import { Resend } from "resend";

const CHOICES = ["shore", "feast", "drift"] as const;
type Choice = (typeof CHOICES)[number];

const LABELS: Record<Choice, string> = {
  shore: "Shore — outside / meet at the harbor",
  feast: "Feast — another night in",
  drift: "Drift — ask me again later",
};

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

export default async function handler(req: Request): Promise<Response> {
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

  const allowed = process.env.NOTIFY_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed && allowed.length > 0) {
    const origin = req.headers.get("origin");
    /* Μόνο όταν υπάρχει Origin (π.χ. browser)· αλλιώς same-origin / curl δεν μπλοκάρονται λάθος. */
    if (origin && !allowed.some((o) => origin === o)) {
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

  const label = LABELS[choice];
  const subject = `Date Idea — harbor choice: ${choice}`;
  const html = `<p>Someone clicked <strong>I'm sure</strong> on <em>Date Idea</em>.</p>
<p><strong>Choice:</strong> ${label}<br /><code>${choice}</code></p>
<p style="color:#666;font-size:12px">${new Date().toISOString()}</p>`;

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
