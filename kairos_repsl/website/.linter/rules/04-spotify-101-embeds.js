const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 04: 101 Courseware Media, Audio, Spotify, Quiz & Transcript Contract Verification...");

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
    const audioPath = path.join(modDir, "audio.m4a");

    if (!fs.existsSync(indexPath)) {
      violations.push(`101/${item.mod}/index.html is missing`);
      continue;
    }

    if (!fs.existsSync(quizPath)) {
      violations.push(`101/${item.mod}/quiz.html is missing`);
    }

    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size < 100000) {
      violations.push(`101/${item.mod}/audio.m4a faststart audio binary is missing or dud (< 100 KB)`);
    }

    const html = fs.readFileSync(indexPath, "utf8");

    // 1. Verify every <source src="..."> in <audio> resolves on disk
    const sourceMatches = html.match(/<source[^>]*src=["']([^"']+)["']/g) || [];
    if (sourceMatches.length === 0) {
      violations.push(`101/${item.mod}/index.html has no <source> inside <audio>`);
    }
    for (const sm of sourceMatches) {
      const srcVal = sm.match(/src=["']([^"']+)["']/)[1];
      const resolvedAudio = srcVal.startsWith("/") ? path.join(webDir, srcVal) : path.join(modDir, srcVal);
      if (!fs.existsSync(resolvedAudio) || fs.statSync(resolvedAudio).size < 100000) {
        violations.push(`101/${item.mod}/index.html references missing or dud audio source '${srcVal}'`);
      }
    }

    // 2. Verify official YouTube lecture embed
    if (!html.includes(`https://www.youtube.com/embed/${item.yt}`)) {
      violations.push(`101/${item.mod}/index.html is missing expected YouTube lecture embed (${item.yt})`);
    }

    // 3. Verify official Spotify episode embed
    if (!html.includes(`https://open.spotify.com/embed/episode/${item.spotify}`)) {
      violations.push(`101/${item.mod}/index.html is missing expected Spotify episode embed (${item.spotify})`);
    }

    // 4. Verify watch meters (1 video + 1 audio = 2)
    const meters = html.match(/media-playback-meter-container/g) || [];
    if (meters.length < 2) {
      violations.push(`101/${item.mod}/index.html has ${meters.length} watch meters (expected >= 2)`);
    }

    // 5. No redundant status-badge or hero-badge pills
    if (html.includes("status-badge") || html.includes("hero-badge")) {
      violations.push(`101/${item.mod}/index.html contains redundant status-badge or hero-badge pills`);
    }

    // 6. Listed in /101/index.html hub
    if (!hubHtml.includes(`/101/${item.mod}`)) {
      violations.push(`101/index.html is missing link to /101/${item.mod}`);
    }

    // 7. Indexed in transcripts.json
    const hasTranscript = transcripts.some(t => t.id === `class_${item.mod}` && t.transcript_text && t.transcript_text.length > 500);
    if (!hasTranscript) {
      violations.push(`transcripts.json is missing Whisper transcript entry for class_${item.mod}`);
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 04 FAILED: 101 courseware contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 04 PASSED: All ${requiredModules.length} 101 module pages verified (valid audio.m4a, YouTube video, Spotify episode, watch meters, quiz.html, and transcripts)!`);
  return true;
}

module.exports = { run };
