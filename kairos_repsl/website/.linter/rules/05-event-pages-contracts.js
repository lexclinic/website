const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 05: Event Pages Media, Authentic YouTube Clips, 101 Bijection & Monthly Archives...");

  const requiredEvents = [
    { date: "2026-08-22", month: "2026-08", mod: null,  minClips: 1, mustHaveYt: "Cq6rKw-WG8E", inRecent3: false },
    { date: "2026-08-24", month: "2026-08", mod: "1.2", minClips: 5, mustHaveYt: "7ok00LCAW3A", inRecent3: false },
    { date: "2026-08-28", month: "2026-08", mod: "2.1", minClips: 5, mustHaveYt: "enWrMVg04fQ", inRecent3: false },
    { date: "2026-09-04", month: "2026-09", mod: "2.2", minClips: 5, mustHaveYt: "-xgqMiyPA2A", inRecent3: false },
    { date: "2026-09-17", month: "2026-09", mod: "3.1", minClips: 5, mustHaveYt: "nhYRLFgyRq8", inRecent3: false },
    { date: "2026-09-24", month: "2026-09", mod: "3.2", minClips: 5, mustHaveYt: "CIzyHeopPcQ", inRecent3: false },
    { date: "2026-10-01", month: "2026-10", mod: "4.1", minClips: 3, mustHaveYt: "5BAyi_n3lV4", inRecent3: false },
    { date: "2026-10-08", month: "2026-10", mod: "4.2", minClips: 5, mustHaveYt: "PuHUnTEwveg", inRecent3: true },
    { date: "2026-10-15", month: "2026-10", mod: "5.1", minClips: 5, mustHaveYt: "Bepdpe2WceI", inRecent3: true },
    { date: "2026-10-22", month: "2026-10", mod: "5.2", minClips: 5, mustHaveYt: "3LvhVut6Jdw", inRecent3: true }
  ];

  const requiredMonths = ["2026-10", "2026-09", "2026-08"];
  const violations = [];

  const transcriptsFile = path.join(webDir, "transcripts.json");
  let transcripts = [];
  if (fs.existsSync(transcriptsFile)) {
    transcripts = JSON.parse(fs.readFileSync(transcriptsFile, "utf8"));
  } else {
    violations.push("transcripts.json is missing");
  }

  const eventHubFile = path.join(webDir, "event", "index.html");
  const eventHubHtml = fs.existsSync(eventHubFile) ? fs.readFileSync(eventHubFile, "utf8") : "";

  if (!eventHubHtml.includes("filterEventsByCategory")) {
    violations.push("event/index.html is missing Event Subcategory Filter bar (filterEventsByCategory)");
  }

  // Verify Monthly Archive Pages exist and contain no unrecorded director/partner calls
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
      if (monthHtmlMap[m].includes('data-event-category="director_call"') || monthHtmlMap[m].includes('data-event-category="partner_call"')) {
        violations.push(`event/${m}/index.html contains unrecorded past director_call or partner_call cards`);
      }
    }
    if (!eventHubHtml.includes(`/event/${m}/`)) {
      violations.push(`event/index.html is missing link to monthly archive /event/${m}/`);
    }
  }

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

    if (!html.includes(ev.mustHaveYt)) {
      violations.push(`event/${ev.date}/index.html is missing its authentic YouTube clip (${ev.mustHaveYt})`);
    }

    if (ev.mod) {
      if (!html.includes(`/101/${ev.mod}/`)) {
        violations.push(`event/${ev.date}/index.html must link to its exact Companion 101 Module (/101/${ev.mod}/)`);
      }
      const modHtml = fs.readFileSync(path.join(webDir, "101", ev.mod, "index.html"), "utf8");
      if (!modHtml.includes(`/event/${ev.date}/`)) {
        violations.push(`101/${ev.mod}/index.html must link back to its exact Companion Socratic Event (/event/${ev.date}/)`);
      }
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
    console.error(" ❌ RULE 05 FAILED: Event page, Bijection & Monthly Archive contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 05 PASSED: All ${requiredEvents.length} recorded events, authentic YouTube clips, 1-to-1 101 Bijection, and 3 Monthly Archives verified!`);
  return true;
}

module.exports = { run };
