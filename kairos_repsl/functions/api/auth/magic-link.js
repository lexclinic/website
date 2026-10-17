/*
  LexClinic Education Platform — Shared Authentication API Endpoint
*/
export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const email = (payload.email || "").toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email address required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Save session in Cloudflare KV if bound
    if (context.env.LEXCLINIC_AUTH_KV) {
      const sessionToken = `session:${email}:${Date.now()}`;
      await context.env.LEXCLINIC_AUTH_KV.put(sessionToken, JSON.stringify({
        email: email,
        domain: context.request.url.includes("stage.lex.clinic") ? "staging" : "production",
        created_at: new Date().toISOString()
      }), { expirationTtl: 86400 * 30 });
    }

    return new Response(JSON.stringify({
      status: "success",
      message: "Authentication successful",
      email: email,
      token: `token_${Date.now()}`
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
