const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function loadEsModuleFunction(filePath, extraGlobals = {}) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Transform static ES imports used by transcripts.js / sse.js into mock bindings
  code = code.replace(/import\s+transcriptsData\s+from\s+['"][^'"]+['"];?/g, 'const transcriptsData = __transcriptsData;');
  code = code.replace(/import\s+\{\s*logAgentActivity\s*\}\s+from\s+['"][^'"]+['"];?/g, 'const logAgentActivity = async () => {};');

  // Transform export async function / export function into exports.<name>
  const exportedNames = [];
  code = code.replace(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g, (_, fnName) => {
    exportedNames.push(fnName);
    return `async function ${fnName}`;
  });
  code = code.replace(/export\s+function\s+([A-Za-z0-9_]+)/g, (_, fnName) => {
    exportedNames.push(fnName);
    return `function ${fnName}`;
  });

  code += '; ' + exportedNames.map(n => `exports.${n} = ${n};`).join(' ');

  const exportsObj = {};
  const sandbox = {
    exports: exportsObj,
    URL: URL,
    URLSearchParams: URLSearchParams,
    Headers: Headers,
    Request: Request,
    Response: Response,
    TransformStream: TransformStream,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    atob: atob,
    btoa: btoa,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    console: { log: () => {}, error: () => {} },
    ...extraGlobals
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: path.basename(filePath) });
  return exportsObj;
}

async function run(webDir) {
  console.log(" 🧪 Executing Suite 03: Serverless API & MCP JSON-RPC Handler Tests...");
  let assertions = 0;

  const transcriptsData = JSON.parse(fs.readFileSync(path.join(webDir, 'transcripts.json'), 'utf8'));

  // --------------------------------------------------------------------------
  // Test 3.1: Staging Basic Auth Isolation Middleware (functions/_middleware.js)
  // --------------------------------------------------------------------------
  const middleware = loadEsModuleFunction(path.join(webDir, 'functions/_middleware.js'));

  // A) Production domain (lex.clinic) -> passes through without Basic Auth
  const prodRes = await middleware.onRequest({
    request: new Request('https://lex.clinic/101/3.1/'),
    next: async () => new Response('OK_PROD', { status: 200 })
  });
  assert.strictEqual(prodRes.status, 200, 'Production lex.clinic request must bypass Basic Auth');
  assertions += 1;

  // B) Staging domain (stage.lex.clinic) without credentials -> returns 401
  const stageUnauthRes = await middleware.onRequest({
    request: new Request('https://stage.lex.clinic/101/3.1/'),
    next: async () => new Response('OK_STAGE', { status: 200 })
  });
  assert.strictEqual(stageUnauthRes.status, 401, 'Unauthenticated stage.lex.clinic request must return 401');
  assert.ok((stageUnauthRes.headers.get('WWW-Authenticate') || '').includes('Basic'), '401 response must include WWW-Authenticate Basic header');
  assertions += 2;

  // C) Staging domain with valid Basic Auth -> returns 200 + Set-Cookie
  const stageAuthRes = await middleware.onRequest({
    request: new Request('https://stage.lex.clinic/101/3.1/', {
      headers: { Authorization: 'Basic YmVzdGFwZTpsZXhjbGluaWNzdGFnZQ==' }
    }),
    next: async () => new Response('OK_STAGE', { status: 200 })
  });
  assert.strictEqual(stageAuthRes.status, 200, 'Authenticated stage.lex.clinic request must return 200');
  assert.ok((stageAuthRes.headers.get('Set-Cookie') || '').includes('lexclinic_stage_auth=authorized'), 'Authenticated stage response must set auth cookie');
  assertions += 2;

  // --------------------------------------------------------------------------
  // Test 3.2: REST Transcripts API (functions/api/transcripts.js)
  // --------------------------------------------------------------------------
  const transcriptsApi = loadEsModuleFunction(
    path.join(webDir, 'functions/api/transcripts.js'),
    { __transcriptsData: transcriptsData }
  );

  // A) List all sessions
  const listRes = await transcriptsApi.onRequestGet({
    request: new Request('https://stage.lex.clinic/api/transcripts')
  });
  assert.strictEqual(listRes.status, 200, 'GET /api/transcripts should return 200');
  const listData = await listRes.json();
  assert.ok(listData.total_sessions >= 23, `Expected >= 23 transcripts, got ${listData.total_sessions}`);
  assertions += 2;

  // B) Fetch single transcript by ID (Class 6.1)
  const singleRes = await transcriptsApi.onRequestGet({
    request: new Request('https://stage.lex.clinic/api/transcripts?id=class_6.1')
  });
  assert.strictEqual(singleRes.status, 200, 'GET /api/transcripts?id=class_6.1 should return 200');
  const singleData = await singleRes.json();
  assert.strictEqual(singleData.id, 'class_6.1', 'Returned transcript ID should match class_6.1');
  assert.strictEqual(singleData.audio_url, 'https://open.spotify.com/episode/40sELGiloMWg7k8iI5chpI', 'Class 6.1 audio_url should be its official Spotify episode URL');
  assertions += 3;

  // C) Full-text keyword search
  const searchRes = await transcriptsApi.onRequestGet({
    request: new Request('https://stage.lex.clinic/api/transcripts?q=Goldfarb')
  });
  const searchData = await searchRes.json();
  assert.ok(searchData.total_matches >= 1, 'Search for Goldfarb should return at least 1 match');
  assertions += 1;

  // --------------------------------------------------------------------------
  // Test 3.3: Remote MCP JSON-RPC Server (functions/mcp/sse.js)
  // --------------------------------------------------------------------------
  const mcpServer = loadEsModuleFunction(
    path.join(webDir, 'functions/mcp/sse.js'),
    { __transcriptsData: transcriptsData }
  );

  // A) tools/list
  const toolsListRes = await mcpServer.onRequestPost({
    request: new Request('https://stage.lex.clinic/mcp/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    })
  });
  const toolsListJson = await toolsListRes.json();
  assert.strictEqual(toolsListJson.result.tools.length, 3, 'MCP tools/list must expose 3 tools');
  assertions += 1;

  // B) tools/call -> search_transcripts
  const toolCallRes = await mcpServer.onRequestPost({
    request: new Request('https://stage.lex.clinic/mcp/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'search_transcripts', arguments: { query: 'Szabo' } }
      })
    })
  });
  const toolCallJson = await toolCallRes.json();
  const parsedMatches = JSON.parse(toolCallJson.result.content[0].text);
  assert.ok(Array.isArray(parsedMatches) && parsedMatches.length >= 1, 'MCP search_transcripts tool call for Szabo must return matches');
  assertions += 1;

  // --------------------------------------------------------------------------
  // Test 3.4: Shared Media Notes & Approvals API (functions/api/media-notes.js)
  // --------------------------------------------------------------------------
  let inMemoryDriveLedger = {
    meta: { system: 'Test Ledger', version: '2.0.0', updated_at: '2026-10-25T00:00:00Z' },
    approvals: {},
    notes: []
  };

  const mockDriveFetch = async (url, opts = {}) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_drive_token' }), { status: 200 });
    }
    if (url.includes('googleapis.com/drive/v3/files/') && (!opts.method || opts.method === 'GET')) {
      return new Response(JSON.stringify(inMemoryDriveLedger), { status: 200 });
    }
    if (url.includes('googleapis.com/upload/drive/v3/files/') && opts.method === 'PATCH') {
      inMemoryDriveLedger = JSON.parse(opts.body);
      return new Response(JSON.stringify({ id: 'mock_drive_id' }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };

  const mediaNotesApi = loadEsModuleFunction(
    path.join(webDir, 'functions/api/media-notes.js'),
    { fetch: mockDriveFetch }
  );

  const mockEnv = {
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'csec',
    GOOGLE_REFRESH_TOKEN: 'rtok',
    MEDIA_LEDGER_DRIVE_ID: 'mock_drive_id'
  };

  // POST bulk items (1 approval + 1 note)
  const postNotesRes = await mediaNotesApi.onRequestPost({
    env: mockEnv,
    request: new Request('https://stage.lex.clinic/api/media-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            uid: '/101/3.1/#class-3-1-contracts-as-runtimes',
            card_id: 'class-3-1-contracts-as-runtimes',
            page_url: '/101/3.1/',
            rating: 'pass',
            depth: 'thorough',
            reviewer: 'kyle@lex.clinic',
            timestamp: '2026-10-25T16:50:00Z'
          },
          {
            uid: '/101/3.1/#class-3-1-contracts-as-runtimes',
            card_id: 'class-3-1-contracts-as-runtimes',
            page_url: '/101/3.1/',
            comment: 'Audio and video verified.',
            reviewer: 'kyle@lex.clinic',
            timestamp: '2026-10-25T16:50:05Z'
          },
          {
            uid: '/event/2026-10-22/#code-calculus-ai-law',
            card_id: 'code-calculus-ai-law',
            page_url: '/event/2026-10-22/',
            video_title: 'Clip 2: Code, Calculus, & AI Law',
            progress: 100,
            reviewer: 'kyle@lex.clinic',
            timestamp: '2026-10-25T16:50:10Z'
          }
        ]
      })
    })
  });
  const postNotesData = await postNotesRes.json();
  assert.strictEqual(postNotesData.status, 'success', 'POST /api/media-notes should succeed');
  assert.strictEqual(postNotesData.persisted, true, 'POST /api/media-notes should persist new items');
  assert.strictEqual(postNotesData.total_approvals, 1, 'Ledger should contain 1 approval');
  assert.strictEqual(postNotesData.total_notes, 1, 'Ledger should contain 1 note');
  assert.ok(postNotesData.watch_history && postNotesData.watch_history['kyle@lex.clinic|code-calculus-ai-law'].progress === 100, 'Ledger should persist 100% watch progress for code-calculus-ai-law');

  // Re-posting identical items should deduplicate (persisted: false)
  const dupRes = await mediaNotesApi.onRequestPost({
    env: mockEnv,
    request: new Request('https://stage.lex.clinic/api/media-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            uid: '/101/3.1/#class-3-1-contracts-as-runtimes',
            card_id: 'class-3-1-contracts-as-runtimes',
            comment: 'Audio and video verified.',
            reviewer: 'kyle@lex.clinic',
            timestamp: '2026-10-25T16:50:05Z'
          }
        ]
      })
    })
  });
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.total_notes, 1, 'Duplicate note must not be added twice');
  assertions += 5;

  console.log(` ✅ SUITE 03 PASSED: ${assertions} assertions verified (Middleware Auth, Transcripts REST API, MCP JSON-RPC, & Shared Media Ledger API)!`);
  return { passed: true, assertions };
}

module.exports = { run };
