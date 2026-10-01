import transcriptsData from '../../transcripts.json';
import { logAgentActivity } from './logs.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const idParam = url.searchParams.get("id");
  const queryParam = url.searchParams.get("q");

  const apiKey = context.request.headers.get("X-API-Key") || context.request.headers.get("Authorization") || "";

  if (idParam) {
    await logAgentActivity(context, apiKey, "/api/transcripts", `Fetch transcript ID: ${idParam}`);
  } else if (queryParam) {
    await logAgentActivity(context, apiKey, "/api/transcripts", `Search query: '${queryParam}'`);
  } else {
    await logAgentActivity(context, apiKey, "/api/transcripts", "List all transcripts index");
  }

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
  };

  // 1. Single Transcript Request by ID
  if (idParam) {
    const found = transcriptsData.find(t => t.id === idParam || t.class_id === idParam);
    if (found) {
      return new Response(JSON.stringify(found, null, 2), { status: 200, headers });
    }
    return new Response(JSON.stringify({ error: `Transcript '${idParam}' not found.` }), { status: 404, headers });
  }

  // 2. Search Request
  if (queryParam) {
    const q = queryParam.toLowerCase();
    const matches = transcriptsData.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.takeaways.some(tk => tk.toLowerCase().includes(q)) ||
      t.transcript_text.toLowerCase().includes(q)
    );
    return new Response(JSON.stringify({
      query: queryParam,
      total_matches: matches.length,
      results: matches
    }, null, 2), { status: 200, headers });
  }

  // 3. List All Transcripts Index
  const indexList = transcriptsData.map(t => ({
    id: t.id,
    title: t.title,
    date: t.date,
    type: t.type,
    class_id: t.class_id || null,
    speakers: t.speakers,
    audio_url: t.audio_url,
    page_url: t.page_url,
    quiz_url: t.quiz_url,
    takeaways_count: t.takeaways.length,
    transcript_length: t.transcript_text.length
  }));

  return new Response(JSON.stringify({
    total_sessions: indexList.length,
    transcripts: indexList
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
