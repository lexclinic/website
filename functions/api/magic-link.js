export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { email, redirectUrl } = data;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const token = "tok_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const baseUrl = redirectUrl || "https://lex.clinic/event/2026-08-28/lexclinic-session";
    const magicLinkUrl = `${baseUrl}?token=${token}&email=${encodeURIComponent(email)}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #38bdf8; border-radius: 8px; background: #0a1128; color: #ffffff;">
        <h2 style="color: #fbbf24; margin-top: 0;">LexClinic Education Magic Link Login</h2>
        <p style="color: #e2e8f0; font-size: 1rem;">
          Click the button below to complete your login and record your quiz scores:
        </p>
        <div style="margin: 25px 0;">
          <a href="${magicLinkUrl}" style="background: #38bdf8; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Click Here to Log In to LexClinic ➔
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 0.85rem; word-break: break-all;">
          Or copy this URL into your browser:<br>
          <a href="${magicLinkUrl}" style="color: #38bdf8;">${magicLinkUrl}</a>
        </p>
        <hr style="border-color: #1e293b; margin-top: 20px;">
        <p style="font-size: 0.75rem; color: #64748b;">
          Sent from <strong>kyle@lex.clinic</strong> for LexClinic Education quiz participants. If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `;

    // Dispatch email payload directly
    const emailPayload = {
      from: "kyle@lex.clinic",
      fromName: "LexClinic Education (Kyle)",
      to: email,
      subject: "Your Magic Link Login to LexClinic Education",
      html: htmlBody,
      text: `Click here to log in to LexClinic Education: ${magicLinkUrl}`
    };

    // Forward to internal /api/send-email dispatch
    const emailRes = await fetch(new URL("/api/send-email", context.request.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    const emailData = await emailRes.json();

    return new Response(JSON.stringify({
      success: true,
      message: `Magic link dispatched from kyle@lex.clinic to ${email}`,
      token,
      magicLinkUrl,
      emailDispatch: emailData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
