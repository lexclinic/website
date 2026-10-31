const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 04: 101 Courseware Media, Spotify, Quiz, Transcript & No-Dud-Audio Contract Verification...");

  const requiredModules = [
    { mod: "1.1", yt: "hKyvRECt3i0", spotify: "4OEYWEXFtk7at7cloxWJhg" },
    { mod: "1.2", yt: "BOc6rMo3LBY", spotify: "5eQG25T0Ua3oEwkWQ6ZrgG" },
    { mod: "2.1", yt: "jViIb6xpdBU", spotify: "1ZlvbMXup0ra60KoualrmK" },
    { mod: "2.2", yt: "ya64RxLJAcs", spotify: "0sJQFoSdPaxKoTKYpVzMzl" },
    { mod: "3.1", yt: "bXF6M9xyHTQ", spotify: "3wscDCkmWak0Eu6Pl0s6LX" },
    { mod: "3.2", yt: "zbgJ5Y_mM3k", spotify: "38NFwpp5ljMwUcBELQ4qOm" },
    { mod: "4.1", yt: "lMvPOm2qM30", spotify: "0R4coIn8CafPdkCf7hieqR" },
    { mod: "4.2", yt: "PnYBVw9vmzY", spotify: "7KMIyIR1XajBUQJr5rLaEu" },
    { mod: "5.1", yt: "tw3o5UkqQFg", spotify: "2EclBQctcAg5ckYXsJP4Yc" },
    { mod: "5.2", yt: "OtYJCzsxwdE", spotify: "3DRmjl3Vq6VzicLbAblCDH" },
    { mod: "6.1", yt: "fz5ON8vs_gQ", spotify: "40sELGiloMWg7k8iI5chpI" },
    { mod: "6.2", yt: "jAmvvgllLPg", spotify: "2IhGZEMrXXg1rkzg9eSfuz" }
  ];

  const violations = [];

  // Load transcripts.json
  const transcriptsFile = path.join(webDir, "transcripts.json");
  let transcripts = [];
  if (fs.existsSync(transcriptsFile)) {
    transcripts = JSON.parse(fs.readFileSync(transcriptsFile, "utf8"));
  } else {
    violations.push("transcripts.json is missing");
  }

  // Load 101/index.html
  const hubFile = path.join(webDir, "101", "index.html");
  const hubHtml = fs.existsSync(hubFile) ? fs.readFileSync(hubFile, "utf8") : "";

  for (const item of requiredModules) {
    const modDir = path.join(webDir, "101", item.mod);
    const indexPath = path.join(modDir, "index.html");
    const quizPath = path.join(modDir, "quiz.html");

    if (!fs.existsSync(indexPath)) {
      violations.push(`101/${item.mod}/index.html is missing`);
      continue;
    }

    if (!fs.existsSync(quizPath)) {
      violations.push(`101/${item.mod}/quiz.html is missing`);
    }

    const html = fs.readFileSync(indexPath, "utf8");

    // 1. Forbid dud <audio> / Audio Stream cards on 101 pages (Spotify is the official audio player for 101)
    if (html.includes("<audio") || html.includes("-audio-stream")) {
      violations.push(`101/${item.mod}/index.html contains a redundant/dud <audio> card (101 modules must use the Official Spotify Podcast Episode embed)`);
    }

    // 2. Verify official YouTube lecture embed
    if (!html.includes(`https://www.youtube.com/embed/${item.yt}`)) {
      violations.push(`101/${item.mod}/index.html is missing expected YouTube lecture embed (${item.yt})`);
    }

    // 3. Verify official Spotify episode embed
    if (!html.includes(`https://open.spotify.com/embed/episode/${item.spotify}`)) {
      violations.push(`101/${item.mod}/index.html is missing expected Spotify episode embed (${item.spotify})`);
    }

    // 4. Verify watch meter on the video lecture card
    const meters = html.match(/media-playback-meter-container/g) || [];
    if (meters.length < 1) {
      violations.push(`101/${item.mod}/index.html has ${meters.length} watch meters (expected >= 1)`);
    }

    // 5. No redundant status-badge or hero-badge pills
    if (html.includes("status-badge") || html.includes("hero-badge")) {
      violations.push(`101/${item.mod}/index.html contains redundant status-badge or hero-badge pills`);
    }

    // 6. Listed in /101/index.html hub
    if (!hubHtml.includes(`/101/${item.mod}`)) {
      violations.push(`101/index.html is missing link to /101/${item.mod}`);
    }

    // 6b. Exact 1-to-1 Socratic Event bijection (1.1 has no separate recorded event; 1.2 through 6.2 must link to their exact Socratic event)
    if (item.mod === "1.1") {
      if (html.includes("_socratic_companion")) {
        violations.push("101/1.1/index.html must NOT have a fake Socratic Event companion card (1.1 is the foundational self-paced module)");
      }
    } else {
      if (!html.includes("_socratic_companion") || !html.includes("/event/")) {
        violations.push(`101/${item.mod}/index.html is missing the Live Socratic Cohort Companion card linking to /event/`);
      }
    }

    // 6c. Single Progressive Quiz CTA (data-progressive-quiz-cid) & no side-by-side quiz-expert link
    if (!html.includes(`data-progressive-quiz-cid="${item.mod}"`)) {
      violations.push(`101/${item.mod}/index.html is missing single progressive quiz CTA (data-progressive-quiz-cid="${item.mod}")`);
    }
    if (html.includes('href="quiz-expert/"')) {
      violations.push(`101/${item.mod}/index.html still contains a direct href="quiz-expert/" link instead of using the single progressive quiz CTA`);
    }

    // 7. Indexed in transcripts.json & distinct from Socratic event transcripts
    const tEntry = transcripts.find(t => t.id === `class_${item.mod}`);
    const hasTranscript = Boolean(tEntry && tEntry.transcript_text && tEntry.transcript_text.length > 500);
    if (!hasTranscript) {
      violations.push(`transcripts.json is missing Whisper transcript entry for class_${item.mod}`);
    }
    if (item.mod === "4.1") {
      const ev41 = transcripts.find(t => t.id === "event_2026-10-01");
      if (tEntry && ev41 && tEntry.transcript_text === ev41.transcript_text) {
        violations.push("transcripts.json class_4.1 is a duplicate copy of event_2026-10-01 instead of the authentic lMvPOm2qM30 101 Explainer transcript");
      }
      if (html.includes("cycloidal") || html.includes("D^n terminus")) {
        violations.push("101/4.1/index.html contains mismatched cycloidal / D^n terminus overview text instead of Class 4.1 Decoupling Logic from Assets overview");
      }
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 04 FAILED: 101 courseware contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 04 PASSED: All ${requiredModules.length} 101 module pages verified (YouTube lecture, Spotify episode, zero dud <audio> cards, quiz.html, and transcripts)!`);
  return true;
}

module.exports = { run };
