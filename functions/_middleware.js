export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  const cookies = request.headers.get("Cookie") || "";
  const authHeader = request.headers.get("Authorization");

  const REQUIRED_USER = "bestape";
  const STAGE_PASS = "lexclinicstage";
  const AUTH_COOKIE_NAME = "lexclinic_stage_auth";

  // Check if authorized cookie is present
  if (cookies.includes(`${AUTH_COOKIE_NAME}=authorized`)) {
    return await context.next();
  }

  // Check Basic Auth header
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(":");

      // Require exact username "bestape" and password "lexclinicstage"
      if (username === REQUIRED_USER && password === STAGE_PASS) {
        const response = await context.next();
        // Set persistent 30-day authorization cookie
        const newHeaders = new Headers(response.headers);
        newHeaders.append("Set-Cookie", `${AUTH_COOKIE_NAME}=authorized; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }
    } catch (e) {}
  }

  // Prompt for HTTP Basic Authentication if unauthorized
  return new Response("🔒 Staging Access Restricted — Authorized LexClinic Personnel Only.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="LexClinic Staging Access (User: bestape | Password: lexclinicstage)"',
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
