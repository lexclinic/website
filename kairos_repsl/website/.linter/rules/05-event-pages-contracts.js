const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 05: Event Pages Media, Audio, Monthly Archives, Category Filters & Transcript Parity...");

  const requiredEvents = [
    { date: "2026-08-13", month: "2026-08", minClips: 1, inRecent3: false },
    { date: "2026-08-20", month: "2026-08", minClips: 2, inRecent3: false },
    { date: "2026-09-04", month: "2026-09", minClips: 5, inRecent3: false },
    { date: "2026-09-17", month: "2026-09", minClips: 5, inRecent3: false },
    { date: "2026-09-24", month: "2026-09", minClips: 5, inRecent3: false },
    { date: "2026-10-01", month: "2026-10", minClips: 3, inRecent3: false },
    { date: "2026-10-08", month: "2026-10", minClips: 5, inRecent3: true },
    { date: "2026-10-15", month: "2026-10", minClips: 5, inRecent3: true },
    { date: "2026-10-22", month: "2026-10", minClips: 5, inRecent3: true }
  ];

  const requiredMonths = ["2026-10", "2026-09", "2026-08"];
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

  if (!eventHubHtml.includes("filterEventsByCategory")) {
    violations.push("event/index.html is missing Event Subcategory Filter bar (filterEventsByCategory)");
  }

  // Verify Monthly Archive Pages exist and are linked from event/index.html
  const monthHtmlMap = {};
  for (const m of requiredMonths) {
    const mPath = path.join(webDir, "event", m, "index.html");
    if (!fs.existsSync(mPath)) {
      violations.push(`event/${m}/index.html monthly archive page is missing`);
    } else {
      monthHtmlMap[m] = fs.readFileSync(mPath, "utf8");
      if (!monthHtmlMap[m].includes("filterEventsByCategory")) {
        violations.push(`event/${m}/index.html is missing Event Subcategory Filter bar`);
      }
    }
    if (!eventHubHtml.includes(`/event/${m}/`)) {
      violations.push(`event/index.html is missing link to monthly archive /event/${m}/`);
    }
  }

  // Verify September archive indexes both guest interviews as events
  if (monthHtmlMap["2026-09"]) {
    if (!monthHtmlMap["2026-09"].includes("/interview/lucas-kung/") || !monthHtmlMap["2026-09"].includes("/interview/2026-09-08/james-wigginton/")) {
      violations.push("event/2026-09/index.html must index both September guest interviews (Lukas Küng & James Wigginton)");
    }
  }

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

    if (!html.includes("<audio ")) {
      violations.push(`event/${ev.date}/index.html is missing native <audio> player`);
    }

    const ytMatches = html.match(/youtube\.com\/embed\//g) || [];
    if (ytMatches.length < ev.minClips) {
      violations.push(`event/${ev.date}/index.html has ${ytMatches.length} YouTube clips (expected >= ${ev.minClips})`);
    }

    const meterMatches = html.match(/media-playback-meter-container/g) || [];
    if (meterMatches.length < ev.minClips + 1) {
      violations.push(`event/${ev.date}/index.html has ${meterMatches.length} watch meters (expected >= ${ev.minClips + 1})`);
    }

    if (html.includes("status-badge") || html.includes("hero-badge")) {
      violations.push(`event/${ev.date}/index.html contains redundant status-badge or hero-badge pills`);
    }

    // Recent 3 must be on /event/index.html; older events must be on their respective /event/<YYYY-MM>/index.html page (and NOT cluttering /event/index.html)
    if (ev.inRecent3) {
      if (!eventHubHtml.includes(`/event/${ev.date}/`)) {
        violations.push(`event/index.html must display top-3 recent event /event/${ev.date}/`);
      }
    } else {
      if (eventHubHtml.includes(`/event/${ev.date}/`)) {
        violations.push(`event/index.html should only show the 3 most recent recorded events, but still links directly to older event /event/${ev.date}/`);
      }
    }

    if (monthHtmlMap[ev.month] && !monthHtmlMap[ev.month].includes(`/event/${ev.date}/`)) {
      violations.push(`Monthly archive event/${ev.month}/index.html is missing link to /event/${ev.date}/`);
    }

    const hasTranscript = transcripts.some(t => t.page_url === `/event/${ev.date}/` || (t.id && t.id.includes(ev.date)));
    if (!hasTranscript) {
      violations.push(`transcripts.json is missing Whisper transcript entry for event/${ev.date}`);
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 05 FAILED: Event page & Monthly Archive contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 05 PASSED: All ${requiredEvents.length} recorded events, 3 Recent Events on /event/, 3 Monthly Archive Pages (/event/2026-10/, /09/, /08/), and Category Filters verified!`);
  return true;
}

module.exports = { run };
