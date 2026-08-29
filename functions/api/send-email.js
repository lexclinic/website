const SERVICE_ACCOUNT_EMAIL = "lexclinic-agent@metagit.iam.gserviceaccount.com";
const DELEGATED_USER = "kyle@lex.clinic";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function pemToBinary(pem) {
  const cleanPem = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/[\r\n\s]/g, "");

  const binaryDerString = atob(cleanPem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return binaryDer.buffer;
}

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function arrayBufferToBase64Url(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

async function getGoogleWorkspaceAccessToken(privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: SERVICE_ACCOUNT_EMAIL,
    sub: DELEGATED_USER,
    scope: GMAIL_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;

  const binaryKey = pemToBinary(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedJwt)
  );

  const jwt = `${unsignedJwt}.${arrayBufferToBase64Url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function buildMimeMessage(to, subject, bodyHtml) {
  const cleanSubject = subject.replace(/[^\x00-\x7F]/g, "");

  const rawMsg = [
    `To: ${to}`,
    `From: LexClinic Login <login@lex.clinic>`,
    `Subject: ${cleanSubject || "LexClinic Magic Link Login"}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    bodyHtml
  ].join("\r\n");

  return btoa(unescape(encodeURIComponent(rawMsg)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { to, subject, html, text } = data;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'subject' field" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const pemKey = context.env.GCP_PRIVATE_KEY;

    if (!pemKey) {
      return new Response(JSON.stringify({ error: "GCP_PRIVATE_KEY environment variable not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 1. Get Access Token via Domain-Wide Delegation JWT for kyle@lex.clinic
    const accessToken = await getGoogleWorkspaceAccessToken(pemKey);

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Failed to obtain Google Workspace access token" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 2. Build Base64URL Encoded MIME Message from login@lex.clinic
    const rawMime = buildMimeMessage(to, subject, html || `<p>${text}</p>`);

    // 3. Dispatch Email via Gmail API
    const sendRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${DELEGATED_USER}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: rawMime })
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      return new Response(JSON.stringify({ error: sendData.error?.message || "Gmail API send error", sendData }), {
        status: sendRes.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Magic link email sent permanently from login@lex.clinic to ${to}!`,
      gmailId: sendData.id
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
