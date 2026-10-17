/*
  LexClinic Education Platform — Media Notes & Approvals API Endpoint
*/
export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    
    // Log & Store in Cloudflare KV if bound, or return success acknowledgment
    if (context.env.MEDIA_NOTES_KV) {
      const key = `note:${payload.reviewer || 'anonymous'}:${payload.card_id}:${Date.now()}`;
      await context.env.MEDIA_NOTES_KV.put(key, JSON.stringify(payload));
    }

    return new Response(JSON.stringify({
      status: "success",
      message: "Media note and approval rating received",
      data: payload
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
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
