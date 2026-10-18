const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 02: Event Listener Links (HTML ➔ JS Mapping)...");

  // Read all JS
  const jsDir = path.join(webDir, "js");
  let code = "";
  function readAllJs(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        readAllJs(full);
      } else if (f.endsWith(".js")) {
        code += fs.readFileSync(full, "utf8") + "\n";
      }
    }
  }

  readAllJs(jsDir);
  if (fs.existsSync(path.join(webDir, "script.js"))) code += fs.readFileSync(path.join(webDir, "script.js"), "utf8") + "\n";
  if (fs.existsSync(path.join(webDir, "events.js"))) code += fs.readFileSync(path.join(webDir, "events.js"), "utf8") + "\n";

  const nativeDomMethods = [
    "event", "preventDefault", "alert", "closest", "removeItem", "setItem",
    "replaceState", "open", "close", "reload", "stopPropagation", "focus"
  ];

  const missingInJs = [];

  function scanHtml(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanHtml(full);
      } else if (f.endsWith(".html")) {
        const html = fs.readFileSync(full, "utf8");

        // Extract inline <script> tags to capture page-specific functions
        const inlineScripts = html.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
        let localInlineCode = "";
        inlineScripts.forEach(s => { localInlineCode += s + "\n"; });

        const onclicks = html.match(/onclick=["'](.*?)["']/g) || [];
        for (const oc of onclicks) {
          const fnMatch = oc.match(/([a-zA-Z0-9_]+)\s*\(/);
          if (fnMatch) {
            const fnName = fnMatch[1];
            if (!nativeDomMethods.includes(fnName)) {
              if (!code.includes(`window.${fnName}`) && !code.includes(`function ${fnName}`) && !localInlineCode.includes(`function ${fnName}`)) {
                missingInJs.push({ fnName, file: path.relative(webDir, full) });
              }
            }
          }
        }
      }
    }
  }

  scanHtml(webDir);

  if (missingInJs.length > 0) {
    console.error(" ❌ RULE 02 FAILED: Unmapped HTML onclick handlers:");
    missingInJs.forEach(m => console.error(`    - Function '${m.fnName}' in ${m.file}`));
    return false;
  }

  console.log(" ✅ RULE 02 PASSED: 100% of HTML inline event handlers map to defined JS functions!");
  return true;
}

module.exports = { run };
