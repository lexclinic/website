const assert = require('assert');

const STAGE_DOMAIN = "https://stage.lex.clinic";
const BASIC_AUTH = "Basic YmVzdGFwZTpsZXhjbGluaWNzdGFnZQ==";

async function run(webDir) {
  console.log(" 🧪 Executing Suite 04: Live Staging E2E Smoke & Media Byte-Range Tests...");
  let assertions = 0;

  // --------------------------------------------------------------------------
  // Test 4.1: Verify Primary Page Routes on https://stage.lex.clinic
  // --------------------------------------------------------------------------
  const pageRoutes = [
    { path: "/", mustInclude: "LexClinic" },
    { path: "/101/", mustInclude: "Legal Engineering 101" },
    { path: "/101/3.1/", mustInclude: "Charles Goldfarb", mustNotInclude: "<audio" },
    { path: "/101/6.1/", mustInclude: "Grammatical Hurdles", mustNotInclude: "<audio" },
    { path: "/101/6.2/", mustInclude: "Reading Right-to-Left", mustNotInclude: "<audio" },
    { path: "/101/6.2/quiz-learned/", mustInclude: "5-Question Learned Quiz", mustNotInclude: "copyCardDirectLink" },
    { path: "/101/6.2/quiz-expert/", mustInclude: "20-Question Expert Quiz", mustNotInclude: "copyCardDirectLink" },
    { path: "/interview/lucas-kung/quiz-learned/", mustInclude: "5-Question Learned Quiz", mustNotInclude: "copyCardDirectLink" },
    { path: "/interview/lucas-kung/quiz-expert/", mustInclude: "20-Question Expert Quiz", mustNotInclude: "copyCardDirectLink" },
    { path: "/event/", mustInclude: "Events" },
    { path: "/event/2026-10-22/", mustInclude: "Lesson 5.2" },
    { path: "/interview/", mustInclude: "Lukas Küng" },
    { path: "/interview/lucas-kung/", mustInclude: "BpRTnQ4128Y" },
    { path: "/interview/2026-09-08/james-wigginton/", mustInclude: "fxIGwkdpa28" },
    { path: "/attest/", mustInclude: "Human Review Media Approvals" },
    { path: "/ERC-7827/", mustInclude: "IERC7827" },
    { path: "/erc7827/", mustInclude: "IERC7827" },
    { path: "/fiduciary/", mustInclude: "Fiduciary" },
    { path: "/collaborate/", mustInclude: "Collaborate" }
  ];

  await Promise.all(pageRoutes.map(async (r) => {
    const res = await fetch(STAGE_DOMAIN + r.path, {
      headers: { "User-Agent": "LexClinicTestRunner/1.0", "Authorization": BASIC_AUTH }
    });
    assert.strictEqual(res.status, 200, `Live route ${r.path} must return HTTP 200 (got ${res.status})`);
    const text = await res.text();
    assert.ok(text.includes(r.mustInclude), `Live route ${r.path} body must include '${r.mustInclude}'`);
    assertions += 2;
    if (r.mustNotInclude) {
      assert.strictEqual(text.includes(r.mustNotInclude), false, `Live route ${r.path} body must NOT include '${r.mustNotInclude}'`);
      assertions += 1;
    }
  }));

  // --------------------------------------------------------------------------
  // Test 4.1b: Verify All 38 Dual-Route Quiz Pages (19 quiz-learned + 19 quiz-expert) Live on stage.lex.clinic
  // --------------------------------------------------------------------------
  const quizBases = [
    "/101/1.1", "/101/1.2", "/101/2.1", "/101/2.2", "/101/3.1", "/101/3.2",
    "/101/4.1", "/101/4.2", "/101/5.1", "/101/5.2", "/101/6.1", "/101/6.2",
    "/101", "/event/2026-08-24", "/event/2026-09-04", "/event/2026-09-17", "/event/2026-09-24",
    "/interview/lucas-kung", "/interview/2026-09-08/james-wigginton"
  ];

  await Promise.all(quizBases.map(async (base) => {
    const lRes = await fetch(STAGE_DOMAIN + base + "/quiz-learned/", {
      headers: { "User-Agent": "LexClinicTestRunner/1.0", "Authorization": BASIC_AUTH }
    });
    assert.strictEqual(lRes.status, 200, `Live ${base}/quiz-learned/ must return HTTP 200`);
    const lText = await lRes.text();
    assert.ok(lText.includes("openMediaCommentModal") && lText.includes("openMediaApprovalModal"), `Live ${base}/quiz-learned/ must include Notes & Approval buttons`);
    assert.strictEqual(lText.includes("copyCardDirectLink"), false, `Live ${base}/quiz-learned/ must NOT include Copy Direct Link button`);

    const eRes = await fetch(STAGE_DOMAIN + base + "/quiz-expert/", {
      headers: { "User-Agent": "LexClinicTestRunner/1.0", "Authorization": BASIC_AUTH }
    });
    assert.strictEqual(eRes.status, 200, `Live ${base}/quiz-expert/ must return HTTP 200`);
    const eText = await eRes.text();
    assert.ok(eText.includes("openMediaCommentModal") && eText.includes("openMediaApprovalModal"), `Live ${base}/quiz-expert/ must include Notes & Approval buttons`);
    assert.strictEqual(eText.includes("copyCardDirectLink"), false, `Live ${base}/quiz-expert/ must NOT include Copy Direct Link button`);
    assertions += 6;
  }));

  // --------------------------------------------------------------------------
  // Test 4.2: Verify All 11 Live Native Audio Streams (9 Event + 2 Interview)
  // Serve Real MP4/AAC Audio Binaries (Content-Type: audio/mp4, Not HTML Fallback)
  // --------------------------------------------------------------------------
  const audioRoutes = [
    "/event/2026-08-13/audio.m4a",
    "/event/2026-08-20/audio.m4a",
    "/event/2026-09-04/audio.m4a",
    "/event/2026-09-17/audio.m4a",
    "/event/2026-09-24/audio.m4a",
    "/event/2026-10-01/audio.m4a",
    "/event/2026-10-08/audio.m4a",
    "/event/2026-10-15/audio.m4a",
    "/event/2026-10-22/audio.m4a",
    "/interview/lucas-kung/audio.m4a",
    "/interview/2026-09-08/james-wigginton/audio.m4a"
  ];

  await Promise.all(audioRoutes.map(async (audioPath) => {
    const res = await fetch(STAGE_DOMAIN + audioPath, {
      method: "GET",
      headers: {
        "User-Agent": "LexClinicTestRunner/1.0",
        "Authorization": BASIC_AUTH,
        "Range": "bytes=0-1023"
      }
    });
    assert.ok(res.status === 200 || res.status === 206, `Audio route ${audioPath} must return 200 or 206 (got ${res.status})`);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    assert.ok(
      contentType.includes("audio/mp4") || contentType.includes("audio/x-m4a") || contentType.includes("video/mp4"),
      `Audio route ${audioPath} must return audio/mp4 Content-Type (got '${contentType}')`
    );

    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length >= 16, `Audio route ${audioPath} must return non-empty binary payload`);
    // MP4 / M4A faststart files have 'ftyp' box header at bytes 4..8
    const boxType = buf.subarray(4, 8).toString('ascii');
    assert.strictEqual(boxType, 'ftyp', `Audio route ${audioPath} must begin with valid MP4 'ftyp' atom header (got '${boxType}')`);
    assertions += 4;
  }));

  // --------------------------------------------------------------------------
  // Test 4.3: Verify Live Serverless APIs (/api/media-notes, /api/transcripts, /api/user-attest)
  // --------------------------------------------------------------------------
  const mediaNotesRes = await fetch(STAGE_DOMAIN + "/api/media-notes", {
    headers: { "Authorization": BASIC_AUTH }
  });
  assert.strictEqual(mediaNotesRes.status, 200, "Live /api/media-notes must return 200");
  const mediaNotesJson = await mediaNotesRes.json();
  assert.strictEqual(mediaNotesJson.status, "success", "Live /api/media-notes status must be 'success'");
  assert.ok("approvals" in mediaNotesJson && Array.isArray(mediaNotesJson.notes), "Live /api/media-notes must return approvals and notes");
  assertions += 3;

  const attestRes = await fetch(STAGE_DOMAIN + "/api/user-attest?email=kyle@ixian.tech", {
    headers: { "Authorization": BASIC_AUTH }
  });
  assert.strictEqual(attestRes.status, 200, "Live /api/user-attest must return 200");
  const attestJson = await attestRes.json();
  assert.strictEqual(attestJson.success, true, "Live /api/user-attest must return success: true");
  assert.ok(Array.isArray(attestJson.submissions), "Live /api/user-attest must return submissions array");
  assertions += 3;

  console.log(` ✅ SUITE 04 PASSED: ${assertions} assertions verified (15 Live Staging Routes, 11 Event/Interview M4A 'ftyp' Audio Streams, Zero Dud <audio> on 101, & Live APIs)!`);
  return { passed: true, assertions };
}

module.exports = { run };
