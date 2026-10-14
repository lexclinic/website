// Global in-memory ring buffer across Cloudflare Worker isolate invocations
if (!globalThis.__agent_activity_logs__) {
  globalThis.__agent_activity_logs__ = [];
}

export async function logAgentActivity(context, apiKey, endpoint, detail) {
  try {
    const request = context.request;
    const userAgent = request.headers.get("User-Agent") || "Unknown Agent";
    const cfCountry = request.cf?.country || "US";
    const cfCity = request.cf?.city || "Edge";

    let cleanKey = (apiKey || "").replace("Bearer ", "").trim();
    let keyPrefix = "Unauthenticated";
    if (cleanKey && cleanKey.startsWith("lex_")) {
      keyPrefix = cleanKey.length > 10 ? cleanKey.substring(0, 10) + "..." : cleanKey;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      agent: userAgent,
      key_prefix: keyPrefix,
      endpoint: endpoint,
      detail: detail,
      location: `${cfCity}, ${cfCountry}`
    };

    // 1. Always record to global in-memory ring buffer
    globalThis.__agent_activity_logs__.unshift(logEntry);
    if (globalThis.__agent_activity_logs__.length > 50) {
      globalThis.__agent_activity_logs__.pop();
    }

    // 2. Also persist to Cloudflare KV if namespace bound
    if (context.env && context.env.TRANSCRIPT_KEYS_KV) {
      await context.env.TRANSCRIPT_KEYS_KV.put(`log_${Date.now()}`, JSON.stringify(logEntry), {
        expirationTtl: 86400 * 7
      });
    }
  } catch (err) {}
}

export async function onRequestGet(context) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
  };

  const headerKey = context.request.headers.get("X-API-Key") || "";
  const authHeader = context.request.headers.get("Authorization") || "";

  let rawKey = headerKey;
  if (!rawKey && authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.replace("Bearer ", "").trim();
  }

  // 1. Enforce Strict API Key Guard: Must start with lex_
  if (!rawKey || !rawKey.startsWith("lex_")) {
    return new Response(JSON.stringify({
      error: "Authentication required to view agent activity logs. Provide 'X-API-Key: lex_...' or 'Authorization: Bearer lex_...' header."
    }, null, 2), { status: 401, headers });
  }

  const reqKeyPrefix = rawKey.length > 10 ? rawKey.substring(0, 10) + "..." : rawKey;

  let logsList = [...(globalThis.__agent_activity_logs__ || [])];

  try {
    if (context.env && context.env.TRANSCRIPT_KEYS_KV) {
      const keysRes = await context.env.TRANSCRIPT_KEYS_KV.list({ prefix: "log_", limit: 50 });
      const kvLogs = [];
      for (const k of keysRes.keys) {
        const val = await context.env.TRANSCRIPT_KEYS_KV.get(k.name);
        if (val) {
          try { kvLogs.push(JSON.parse(val)); } catch(e) {}
        }
      }
      if (kvLogs.length > 0) {
        logsList = kvLogs;
      }
    }
  } catch(err) {}

  // 2. Enforce User Key Isolation: Only return logs matching the requesting key prefix
  const userLogs = logsList.filter(l => l.key_prefix === reqKeyPrefix);
  userLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return new Response(JSON.stringify({
    authenticated_key_prefix: reqKeyPrefix,
    total_logs_found: userLogs.length,
    agent_activity: userLogs
  }, null, 2), { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
    }
  });
}
