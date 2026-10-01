import transcriptsData from '../../transcripts.json';
import { logAgentActivity } from '../api/logs.js';

export async function onRequestGet(context) {
  const headers = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  };

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  async function sendEvent(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(payload));
  }

  // Handle SSE handshake for remote MCP agents
  (async () => {
    try {
      await sendEvent("endpoint", "/mcp/sse");
      await sendEvent("message", {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {
          serverInfo: {
            name: "LexClinic Transcripts Remote MCP Server",
            version: "1.0.0"
          },
          capabilities: {
            tools: {
              list_transcripts: {},
              get_transcript: {},
              search_transcripts: {}
            }
          }
        }
      });
    } catch (err) {}
  })();

  return new Response(readable, { status: 200, headers });
}

export async function onRequestPost(context) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const body = await context.request.json();
    const { jsonrpc, id, method, params } = body;
    const apiKey = context.request.headers.get("X-API-Key") || context.request.headers.get("Authorization") || "";

    if (method === "tools/call") {
      await logAgentActivity(context, apiKey, "/mcp/sse", `MCP Tool Call: '${params?.name}' args=${JSON.stringify(params?.arguments || {})}`);
    }

    if (method === "tools/list") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "list_transcripts",
              description: "List all LexClinic session and interview transcripts.",
              inputSchema: { type: "object", properties: {} }
            },
            {
              name: "get_transcript",
              description: "Fetch full transcript text and Hansard takeaways by session ID.",
              inputSchema: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Session ID (e.g. '2026-09-24-class-3.2')" }
                },
                required: ["id"]
              }
            },
            {
              name: "search_transcripts",
              description: "Search across all LexClinic legal engineering transcripts and takeaways.",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "Keyword query string" }
                },
                required: ["query"]
              }
            }
          ]
        }
      }, null, 2), { status: 200, headers });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "list_transcripts") {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(transcriptsData, null, 2) }] }
        }, null, 2), { status: 200, headers });
      }

      if (toolName === "get_transcript") {
        const found = transcriptsData.find(t => t.id === args.id || t.class_id === args.id);
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(found || { error: "Not found" }, null, 2) }] }
        }, null, 2), { status: 200, headers });
      }

      if (toolName === "search_transcripts") {
        const q = (args.query || "").toLowerCase();
        const matches = transcriptsData.filter(t => 
          t.title.toLowerCase().includes(q) ||
          t.takeaways.some(tk => tk.toLowerCase().includes(q)) ||
          t.transcript_text.toLowerCase().includes(q)
        );
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] }
        }, null, 2), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "Method not found" }
    }), { status: 404, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
