const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 06: Interview Pages Media, Audio, Quiz, Transcript & Hub Parity Verification...");

  const requiredInterviews = [
    {
      relDir: "interview/lucas-kung",
      transcriptId: "2026-09-18-lucas-kung",
      expectedClips: [
        "BpRTnQ4128Y", "b9zluOY9qpM", "h7P8r_cGvxw",
        "tnLETwm-dMY", "lBToaLiMPIM", "fVNCzWejRqo",
        "S205Glr5eJU", "dvbzF8T506w", "pKJYpUpdmqc",
        "5u4cBvkOlo4", "s-TYcAsBv5A"
      ],
      hubLinkPatterns: ["/interview/lucas-kung/", "/interview/2026-09-18/lucas-kung/"]
    },
    {
      relDir: "interview/2026-09-08/james-wigginton",
      transcriptId: "2026-09-08-james-wigginton",
      expectedClips: [
        "fxIGwkdpa28", "arji7tjbIRg", "uiZaaUqXgz4"
      ],
      hubLinkPatterns: ["/interview/2026-09-08/james-wigginton/"]
    }
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

  // Load interview/index.html
  const interviewHubFile = path.join(webDir, "interview", "index.html");
  const interviewHubHtml = fs.existsSync(interviewHubFile) ? fs.readFileSync(interviewHubFile, "utf8") : "";
  if (!interviewHubHtml) {
    violations.push("interview/index.html is missing");
  } else if (interviewHubHtml.includes("status-badge") || interviewHubHtml.includes("hero-badge")) {
    violations.push("interview/index.html contains redundant status-badge or hero-badge pills");
  }

  for (const iv of requiredInterviews) {
    const ivDir = path.join(webDir, iv.relDir);
    const indexHtmlPath = path.join(ivDir, "index.html");
    const quizHtmlPath = path.join(ivDir, "quiz.html");
    const audioM4aPath = path.join(ivDir, "audio.m4a");

    if (!fs.existsSync(indexHtmlPath)) {
      violations.push(`${iv.relDir}/index.html is missing`);
      continue;
    }

    if (!fs.existsSync(quizHtmlPath)) {
      violations.push(`${iv.relDir}/quiz.html is missing`);
    }

    if (!fs.existsSync(audioM4aPath) || fs.statSync(audioM4aPath).size < 100000) {
      violations.push(`${iv.relDir}/audio.m4a faststart audio binary is missing or dud (< 100 KB)`);
    }

    const html = fs.readFileSync(indexHtmlPath, "utf8");

    // 1. Native <audio> element & valid <source> check
    if (!html.includes("<audio ")) {
      violations.push(`${iv.relDir}/index.html is missing native <audio> player`);
    }
    const sourceMatches = html.match(/<source[^>]*src=["']([^"']+)["']/g) || [];
    if (sourceMatches.length === 0) {
      violations.push(`${iv.relDir}/index.html has no <source> inside <audio>`);
    }
    for (const sm of sourceMatches) {
      const srcVal = sm.match(/src=["']([^"']+)["']/)[1];
      const resolvedAudio = srcVal.startsWith("/") ? path.join(webDir, srcVal) : path.join(ivDir, srcVal);
      if (!fs.existsSync(resolvedAudio) || fs.statSync(resolvedAudio).size < 100000) {
        violations.push(`${iv.relDir}/index.html references missing or dud audio source '${srcVal}'`);
      }
    }

    // 2. Verify exact expected YouTube clips
    for (const clipId of iv.expectedClips) {
      if (!html.includes(`https://www.youtube.com/embed/${clipId}`)) {
        violations.push(`${iv.relDir}/index.html is missing expected YouTube clip embed (${clipId})`);
      }
    }

    // 3. Media playback meters check (1 audio + expectedClips.length video)
    const meterMatches = html.match(/media-playback-meter-container/g) || [];
    const expectedMeters = iv.expectedClips.length + 1;
    if (meterMatches.length < expectedMeters) {
      violations.push(`${iv.relDir}/index.html has ${meterMatches.length} watch meters (expected >= ${expectedMeters})`);
    }

    // 4. No redundant status-badge or hero-badge pills check
    if (html.includes("status-badge") || html.includes("hero-badge")) {
      violations.push(`${iv.relDir}/index.html contains redundant status-badge or hero-badge pills`);
    }

    // 5. Listed in /interview/index.html hub
    const hasHubLink = iv.hubLinkPatterns.some(pat => interviewHubHtml.includes(pat));
    if (!hasHubLink) {
      violations.push(`interview/index.html is missing link to ${iv.relDir}`);
    }

    // 6. Indexed in transcripts.json with non-empty transcript_text
    const hasTranscript = transcripts.some(t => t.id === iv.transcriptId && t.transcript_text && t.transcript_text.length > 500);
    if (!hasTranscript) {
      violations.push(`transcripts.json is missing Whisper transcript entry for ${iv.transcriptId}`);
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 06 FAILED: Interview page contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 06 PASSED: All ${requiredInterviews.length} interview pages verified (native audio.m4a, authentic YouTube clips, watch meters, quiz.html, transcripts, and hub links)!`);
  return true;
}

module.exports = { run };
