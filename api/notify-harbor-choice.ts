/**
 * Vercel Edge function — sends you an email when someone confirms «I'm sure» with their harbor choice.
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 * - RESEND_API_KEY — from https://resend.com/api-keys
 * - NOTIFY_FROM_EMAIL — verified sender, e.g. `Date Idea <notify@yourdomain.com>`
 * - NOTIFY_TO_EMAIL — optional; defaults to kostaskoukianakis72@gmail.com if unset
 * - NOTIFY_ALLOWED_ORIGINS — optional comma list; if set, only these Origins may POST (e.g. https://your-app.vercel.app,http://localhost:5173)
 */

export const config = { runtime: "edge" };

const CHOICES = ["shore", "feast", "drift"] as const;
type Choice = (typeof CHOICES)[number];

const LABELS: Record<Choice, string> = {
  shore: "Shore — outside / meet at the harbor",
  feast: "Feast — another night in",
  drift: "Drift — ask me again later",
};

const DEFAULT_TO = "kostaskoukianakis72@gmail.com";

function isChoice(x: unknown): x is Choice {
  return typeof x === "string" && (CHOICES as readonly string[]).includes(x);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req: Request): Promise<Response> {
  const baseHeaders = { ...corsHeaders(), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: baseHeaders,
    });
  }

  const allowed = process.env.NOTIFY_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed && allowed.length > 0) {
    const origin = req.headers.get("origin") ?? "";
    if (!origin || !allowed.some((o) => origin === o)) {
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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  const to = process.env.NOTIFY_TO_EMAIL?.trim() || DEFAULT_TO;

  if (!apiKey || !from) {
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ ok: false, error: "Email provider error" }), {
      status: 502,
      headers: baseHeaders,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: baseHeaders });
}
