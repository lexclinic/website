/*
  LexClinic Education Platform — Google Cloud Gmail API Magic Link Worker
*/
const CLIENT_ID = "288664971084-dt9rnn61mj4ej185qcr7chr5du63cao1.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REFRESH_TOKEN = "1//06zrGvfJSS7GKCgYIARAAGAYSNwF-L9IrkkymZVIPMhr4SRkWln86W7_m_eOg9FHbOZXU5rnz4tkN7fG5CgKSHck3kbzy69CN-sA";

async function getGcpAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Failed to exchange GCP refresh token");
  }

  return data.access_token;
}

function buildBase64MimeEmail(recipient, subject, bodyText) {
  const emailLines = [
    `To: ${recipient}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    bodyText
  ];
  
  const mimeString = emailLines.join("\r\n");
  
  // Base64URL encode string
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
    const accessToken = await getGcpAccessToken();

    // 2. Build Email Subject & Body
    const subject = "✨ Your LexClinic Login Magic Link (1-Click Sign In)";
    const bodyText = `Hello,

Here is your 1-click magic link to log into the LexClinic Education Platform:

🔗 ${magicLinkUrl}

Clicking this link will immediately activate your authenticated member session across lex.clinic and stage.lex.clinic, unlocking member notes, approval ratings, and watch progress tracking.

Best regards,
LexClinic Education, Inc. Governance Swarm
https://lex.clinic`;

    const rawBase64 = buildBase64MimeEmail(email, subject, bodyText);

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
