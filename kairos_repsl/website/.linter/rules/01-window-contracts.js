const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 01: Window Function Contracts...");
  const jsDir = path.join(webDir, "js");
  
  let code = "";
  function readAllJs(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        readAllJs(full);
      } else if (f.endswith ? f.endswith(".js") : f.endsWith(".js")) {
        code += fs.readFileSync(full, "utf8") + "\n";
      }
    }
  }

  readAllJs(jsDir);
  if (fs.existsSync(path.join(webDir, "script.js"))) {
    code += fs.readFileSync(path.join(webDir, "script.js"), "utf8") + "\n";
  }
  if (fs.existsSync(path.join(webDir, "events.js"))) {
    code += fs.readFileSync(path.join(webDir, "events.js"), "utf8") + "\n";
  }

  const missing = [];
  for (const fn of config.window_contracts) {
    if (!code.includes(`window.${fn}`) && !code.includes(`function ${fn}`)) {
      missing.push(fn);
    }
  }

  if (missing.length > 0) {
    console.error(` ❌ RULE 01 FAILED: Missing global window functions: ${missing.join(", ")}`);
    return false;
  }

  console.log(` ✅ RULE 01 PASSED: All ${config.window_contracts.length} window function contracts verified!`);
  return true;
}

module.exports = { run };
