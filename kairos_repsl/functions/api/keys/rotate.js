function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  try {
    // Generate 32 cryptographically random bytes (256 bits)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawKeyHex = bufferToHex(randomBytes);
    const fullApiKey = `lex_${rawKeyHex}`;

    // Hash the API key using SHA-256 (Zero raw key storage)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(fullApiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
    const keyHashHex = bufferToHex(hashBuffer);

    const now = new Date().toISOString();

    // Store in Cloudflare KV if bound, or return to client for session persistence
    if (context.env && context.env.TRANSCRIPT_KEYS_KV) {
      await context.env.TRANSCRIPT_KEYS_KV.put(`hash_${keyHashHex}`, JSON.stringify({
        created_at: now,
        tier: "agent_full"
      }));
    }

    return new Response(JSON.stringify({
      status: "success",
      message: "New API key generated successfully. Copy your raw key now — it will not be displayed again.",
      api_key: fullApiKey,
      key_hash: keyHashHex,
      prefix: "lex_***",
      created_at: now
    }, null, 2), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
