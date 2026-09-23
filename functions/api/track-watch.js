export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();

    const email = (body.email || "").trim().toLowerCase();
    const videoId = body.video_id || "unknown";
    const videoTitle = body.video_title || "Untitled Video";
    const pageUrl = body.page_url || "/";
    const progress = body.progress || 0; // percentage (0 - 100)
    const timestamp = body.timestamp || new Date().toISOString();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Return success response acknowledging the watch progress attestation
    return new Response(JSON.stringify({
      success: true,
      message: "Video watch progress successfully recorded",
      record: {
        email,
        video_id: videoId,
        video_title: videoTitle,
        page_url: pageUrl,
        progress,
        timestamp
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", message: err.message }), {
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
