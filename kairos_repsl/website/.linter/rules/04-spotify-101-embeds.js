const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 04: 101 Spotify Episode Embed Verification...");

  const requiredModules = ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2", "6.1", "6.2"];
  const missingSpotify = [];

  for (const mod of requiredModules) {
    const file = path.join(webDir, "101", mod, "index.html");
    if (!fs.existsSync(file)) {
      missingSpotify.push(`101/${mod}/index.html (file missing)`);
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes("https://open.spotify.com/embed/episode/")) {
      missingSpotify.push(`101/${mod}/index.html`);
    }
  }

  if (missingSpotify.length > 0) {
    console.error(" ❌ RULE 04 FAILED: Missing Spotify episode embeds on 101 module pages:");
    missingSpotify.forEach(m => console.error(`    - ${m}`));
    return false;
  }

  console.log(` ✅ RULE 04 PASSED: All ${requiredModules.length} 101 module pages contain verified Spotify episode embeds!`);
  return true;
}

module.exports = { run };
