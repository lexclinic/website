const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 05: Event Pages Media, Audio, Transcript & Hub Parity Verification...");

  const requiredEvents = [
    { date: "2026-08-13", minClips: 1 },
    { date: "2026-08-20", minClips: 2 },
    { date: "2026-09-04", minClips: 5 },
    { date: "2026-09-17", minClips: 5 },
    { date: "2026-09-24", minClips: 5 },
    { date: "2026-10-01", minClips: 3 },
    { date: "2026-10-08", minClips: 5 },
    { date: "2026-10-15", minClips: 5 },
    { date: "2026-10-22", minClips: 5 }
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

  // Load event/index.html
  const eventHubFile = path.join(webDir, "event", "index.html");
  const eventHubHtml = fs.existsSync(eventHubFile) ? fs.readFileSync(eventHubFile, "utf8") : "";

  for (const ev of requiredEvents) {
    const evDir = path.join(webDir, "event", ev.date);
    const indexHtmlPath = path.join(evDir, "index.html");
    const audioM4aPath = path.join(evDir, "audio.m4a");

    if (!fs.existsSync(indexHtmlPath)) {
      violations.push(`event/${ev.date}/index.html is missing`);
      continue;
    }

    if (!fs.existsSync(audioM4aPath)) {
      violations.push(`event/${ev.date}/audio.m4a faststart audio binary is missing`);
    }

    const html = fs.readFileSync(indexHtmlPath, "utf8");

    // 1. Native <audio> element check
    if (!html.includes("<audio ")) {
      violations.push(`event/${ev.date}/index.html is missing native <audio> player`);
    }

    // 2. YouTube explainer clips count check
    const ytMatches = html.match(/youtube\.com\/embed\//g) || [];
    if (ytMatches.length < ev.minClips) {
      violations.push(`event/${ev.date}/index.html has ${ytMatches.length} YouTube clips (expected >= ${ev.minClips})`);
    }

    // 3. Media playback meters check (1 audio + minClips video)
    const meterMatches = html.match(/media-playback-meter-container/g) || [];
    if (meterMatches.length < ev.minClips + 1) {
      violations.push(`event/${ev.date}/index.html has ${meterMatches.length} watch meters (expected >= ${ev.minClips + 1})`);
    }

    // 4. No redundant status-badge pills check
    if (html.includes("status-badge") || html.includes("hero-badge")) {
      violations.push(`event/${ev.date}/index.html contains redundant status-badge or hero-badge pills`);
    }

    // 5. Listed in /event/index.html hub archive
    if (!eventHubHtml.includes(`/event/${ev.date}/`)) {
      violations.push(`event/index.html is missing link to /event/${ev.date}/`);
    }

    // 6. Indexed in transcripts.json
    const hasTranscript = transcripts.some(t => t.page_url === `/event/${ev.date}/` || (t.id && t.id.includes(ev.date)));
    if (!hasTranscript) {
      violations.push(`transcripts.json is missing Whisper transcript entry for event/${ev.date}`);
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 05 FAILED: Event page contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 05 PASSED: All ${requiredEvents.length} recorded event pages verified (native audio.m4a, YouTube clips, watch meters, transcripts, and hub links)!`);
  return true;
}

module.exports = { run };
