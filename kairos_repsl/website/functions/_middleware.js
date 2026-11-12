async function finalizeMediaResponse(request, url, response, extraSetCookie) {
  const isMedia = url.pathname.endsWith(".m4a") || url.pathname.endsWith(".mp4");
  if (!isMedia && !extraSetCookie) {
    return response;
  }

  const newHeaders = new Headers(response.headers);
  if (extraSetCookie) {
    newHeaders.append("Set-Cookie", extraSetCookie);
  }

  if (!isMedia || (response.status !== 200 && response.status !== 206)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  newHeaders.set("Accept-Ranges", "bytes");
  newHeaders.set("Content-Encoding", "identity");

  if (response.status === 206) {
    return new Response(response.body, {
      status: 206,
      statusText: "Partial Content",
      headers: newHeaders
    });
  }

  const rangeHeader = request.headers.get("Range") || request.headers.get("range");
  if (!rangeHeader || !rangeHeader.toLowerCase().startsWith("bytes=")) {
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: 200,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  const fullBuffer = await response.arrayBuffer();
  const total = fullBuffer.byteLength;
  const rangeSpec = rangeHeader.replace(/^bytes=/i, "").split(",")[0].trim();
  const parts = rangeSpec.split("-");
  const startStr = parts[0] ? parts[0].trim() : "";
  const endStr = parts[1] ? parts[1].trim() : "";

  let start = 0;
  let end = total - 1;
  if (startStr === "") {
    const suffixLen = Number.parseInt(endStr, 10);
    if (!Number.isNaN(suffixLen) && suffixLen > 0) {
      start = Math.max(0, total - suffixLen);
    }
  } else {
    start = Number.parseInt(startStr, 10);
    if (endStr !== "") {
      const parsedEnd = Number.parseInt(endStr, 10);
      if (!Number.isNaN(parsedEnd)) {
        end = Math.min(parsedEnd, total - 1);
      }
    }
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || start >= total) {
    newHeaders.set("Content-Range", `bytes */${total}`);
    newHeaders.delete("Content-Length");
    return new Response(null, {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: newHeaders
    });
  }

  const sliced = fullBuffer.slice(start, end + 1);
  newHeaders.set("Content-Range", `bytes ${start}-${end}/${total}`);
  newHeaders.set("Content-Length", String(sliced.byteLength));

  return new Response(request.method === "HEAD" ? null : sliced, {
    status: 206,
    statusText: "Partial Content",
    headers: newHeaders
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  // ONLY enforce Basic Authentication if on STAGING domain
  const isStagingDomain = hostname.includes("stage.lex.clinic") || hostname.includes("stage-lex-clinic");

  if (!isStagingDomain) {
    // Public Production (lex.clinic) — Allow all traffic with HTTP 206 byte-range support
    return await finalizeMediaResponse(request, url, await context.next(), null);
  }

  // CRITICAL FOR MOBILE PWA INSTALLERS (iOS Safari & Android Chrome):
  // Browsers fetch /manifest.webmanifest, /sw.js, and home-screen icons in a credential-less background context.
  // Always allow public read access to PWA metadata & icons even on staging so "Add to Home Screen" / "Install App" succeeds!
  const pwaPublicPaths = ["/manifest.webmanifest", "/sw.js", "/icon-192.png", "/icon-512.png", "/favicon.png", "/favicon.ico"];
  if (pwaPublicPaths.includes(url.pathname)) {
    return await context.next();
  }

  // STAGING ONLY: Enforce Basic Auth
  const cookies = request.headers.get("Cookie") || "";
  const authHeader = request.headers.get("Authorization");

  const REQUIRED_USER = "bestape";
  const STAGE_PASS = "lexclinicstage";
  const AUTH_COOKIE_NAME = "lexclinic_stage_auth";

  // Check if authorized cookie is present
  if (cookies.includes(`${AUTH_COOKIE_NAME}=authorized`)) {
    return await finalizeMediaResponse(request, url, await context.next(), null);
  }

  // Check Basic Auth header
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(":");

      if (username === REQUIRED_USER && password === STAGE_PASS) {
        const cookieVal = `${AUTH_COOKIE_NAME}=authorized; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;
        return await finalizeMediaResponse(request, url, await context.next(), cookieVal);
      }
    } catch (e) {}
  }

  // Prompt for HTTP Basic Authentication if unauthorized on staging
  return new Response("🔒 Staging Access Restricted — Authorized LexClinic Personnel Only.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="LexClinic Staging Access (User: bestape | Password: lexclinicstage)"',
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
