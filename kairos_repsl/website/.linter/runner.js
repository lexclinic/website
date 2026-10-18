#!/usr/bin/env node
/*
  LexClinic Modular DOM & Function Contract Linter Runner
  Executes modular linting rules against contracts.config.json
*/

const fs = require('fs');
const path = require('path');

const linterDir = __dirname;
const webDir = path.resolve(linterDir, "..");
const configFile = path.join(linterDir, "contracts.config.json");

if (!fs.existsSync(configFile)) {
  console.error("❌ ERROR: Missing contracts.config.json in .linter directory!");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
const rulesDir = path.join(linterDir, "rules");

console.log("=== 🛡️ LEXCLINIC MODULAR CONTRACT LINTER ===");
console.log(` Target Substrate: ${webDir}`);
console.log(` Rules Directory:  ${rulesDir}\n`);

let totalPassed = 0;
let totalFailed = 0;

if (fs.existsSync(rulesDir)) {
  const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith(".js")).sort();
  for (const rf of ruleFiles) {
    const ruleModule = require(path.join(rulesDir, rf));
    if (ruleModule && typeof ruleModule.run === 'function') {
      const success = ruleModule.run(webDir, config);
      if (success) totalPassed++;
      else totalFailed++;
    }
  }
}

console.log("\n=== 📊 LINTER SUMMARY ===");
console.log(` Passed Rules: ${totalPassed}`);
console.log(` Failed Rules: ${totalFailed}`);

if (totalFailed > 0) {
  console.error("❌ CONTRACT LINTER FAILED: Fix contract violations before committing!");
  process.exit(1);
} else {
  console.log("🎉 ALL CONTRACT LINT RULES PASSED PERFECTLY!");
  process.exit(0);
}
