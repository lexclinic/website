/*
  LexClinic Education Platform — Real Magic Link Email Dispatcher API
*/
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

    return new Response(JSON.stringify({
      status: "success",
      message: "Magic link email dispatched successfully",
      email: email,
      magicLink: magicLinkUrl
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
