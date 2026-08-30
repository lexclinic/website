const SERVICE_ACCOUNT_EMAIL = "lexclinic-agent@metagit.iam.gserviceaccount.com";
const DELEGATED_USER = "kyle@lex.clinic";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_FILE_ID = "1GidiMBXRYmcDMnAPrgndS35-MsjY1WT7";

const FALLBACK_CLIENT_ID = "288664971084-dt9rnn61mj4ej185qcr7chr5du63cao1.apps.googleusercontent.com";
const FALLBACK_CLIENT_SECRET = "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";
const FALLBACK_REFRESH_TOKEN = "1//06owsSactvT2qCgYIARAAGAYSNwF-L9IrGw8a2BNUsfUAbyfIMgWmf5GHdm9s-e3iZfhgUmhyAPToK6HBrHik5QPfvBApxjmto2A";

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

async function getServiceAccountAccessToken(privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: SERVICE_ACCOUNT_EMAIL,
    sub: DELEGATED_USER,
    scope: DRIVE_SCOPE,
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

async function getFallbackAccessToken() {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: FALLBACK_CLIENT_ID,
    client_secret: FALLBACK_CLIENT_SECRET,
    refresh_token: FALLBACK_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();
  return data.access_token;
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const rawEmail = (url.searchParams.get("email") || "").trim().toLowerCase();

    if (!rawEmail) {
      return new Response(JSON.stringify({ error: "Email parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    let accessToken = null;
    const pemKey = context.env ? context.env.GCP_PRIVATE_KEY : null;

    if (pemKey) {
      try {
        accessToken = await getServiceAccountAccessToken(pemKey);
      } catch (err) {
        console.log("Service Account error, using fallback:", err);
      }
    }

    if (!accessToken) {
      accessToken = await getFallbackAccessToken();
    }

    let userSubmissions = [];
    if (accessToken) {
      const fileUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`;
      const getRes = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (getRes.ok) {
        try {
          const storeData = await getRes.json();
          if (Array.isArray(storeData.submissions)) {
            userSubmissions = storeData.submissions.filter(
              s => (s.email || "").trim().toLowerCase() === rawEmail
            );
          }
        } catch (e) {
          userSubmissions = [];
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      email: rawEmail,
      submissionCount: userSubmissions.length,
      submissions: userSubmissions,
      erc7827Status: "pending_contract_deployment"
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
