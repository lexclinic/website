/*
  LexClinic Education Platform — Google Cloud Gmail API Magic Link Worker
  Subject: Your Magic Link Login to LexClinic Education
*/

async function getGcpAccessToken(env) {
  const clientId = env && env.GOOGLE_CLIENT_ID;
  const clientSecret = env && env.GOOGLE_CLIENT_SECRET;
  const refreshToken = env && env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Failed to exchange GCP refresh token");
  }

  return data.access_token;
}

function buildBase64HtmlMimeEmail(recipient, subject, htmlBody, textBody) {
  const boundary = "----=_Part_" + Date.now();
  const emailLines = [
    `To: ${recipient}`,
    `From: LexClinic Education <kyle@lex.clinic>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ];
  
  const mimeString = emailLines.join("\r\n");
  
  const base64 = btoa(unescape(encodeURIComponent(mimeString)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  return base64;
}

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const email = (payload.email || "").toLowerCase().trim();
    const redirectUrl = payload.redirectUrl || "https://lex.clinic/event/";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email address required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = `magic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const magicLinkUrl = `${redirectUrl}?token=${token}&email=${encodeURIComponent(email)}`;

    // 1. Exchange Refresh Token for Google Cloud Access Token
    const accessToken = await getGcpAccessToken(context.env);

    // 2. Build Exact Subject & HTML Email Body
    const subject = "Your Magic Link Login to LexClinic Education";
    
    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; border: 2px solid #fbbf24; max-width: 550px; margin: 0 auto;">
        <h2 style="color: #fbbf24; font-size: 1.4rem; margin-bottom: 10px;">⚖️ LexClinic Education Sign In</h2>
        <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px;">
          Click the button below to log into your account and access member notes, approval ratings, and watch progress tracking:
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${magicLinkUrl}" style="background: #fbbf24; color: #0a1128; font-weight: 800; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 1rem;">
            ✨ Activate Member Login ➔
          </a>
        </div>
        <p style="font-size: 0.8rem; color: #94a3b8; word-break: break-all;">
          Or copy this URL into your browser:<br>
          <a href="${magicLinkUrl}" style="color: #38bdf8;">${magicLinkUrl}</a>
        </p>
        <hr style="border-color: #1e293b; margin-top: 20px;">
        <p style="font-size: 0.75rem; color: #64748b;">
          Sent from <strong>kyle@lex.clinic</strong> for LexClinic Education members. If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `;

    const textBody = `Click here to log in to LexClinic Education: ${magicLinkUrl}`;

    const rawBase64 = buildBase64HtmlMimeEmail(email, subject, htmlBody, textBody);

    // 3. Dispatch Email via Google Cloud Gmail API
    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: rawBase64 })
    });

    const gmailData = await gmailRes.json();
    if (!gmailRes.ok) {
      throw new Error(gmailData.error?.message || "Google Cloud Gmail API dispatch failed");
    }

    return new Response(JSON.stringify({
      status: "success",
      message: "Magic link email dispatched via Google Cloud Gmail API",
      email: email,
      messageId: gmailData.id
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
