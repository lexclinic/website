#!/usr/bin/env node
/*
  LexClinic Modular Automated Runtime & Integration Test Runner
  Executes all *.test.js suites inside .tests/suites/
*/

const fs = require('fs');
const path = require('path');

const testsDir = __dirname;
const webDir = path.resolve(testsDir, '..');
const suitesDir = path.join(testsDir, 'suites');

async function main() {
  console.log("=== 🧪 LEXCLINIC AUTOMATED RUNTIME & INTEGRATION TEST SUITE ===");
  console.log(` Target Substrate: ${webDir}`);
  console.log(` Suites Directory: ${suitesDir}`);

  const suiteFiles = fs.readdirSync(suitesDir).filter(f => f.endsWith('.test.js')).sort();

  let totalSuitesPassed = 0;
  let totalSuitesFailed = 0;
  let totalAssertions = 0;

  for (const file of suiteFiles) {
    const suitePath = path.join(suitesDir, file);
    const suite = require(suitePath);
    try {
      const result = await suite.run(webDir);
      if (result && result.passed) {
        totalSuitesPassed++;
        totalAssertions += (result.assertions || 0);
      } else {
        totalSuitesFailed++;
      }
    } catch (err) {
      console.error(` ❌ Uncaught exception in ${file}:`, err);
      totalSuitesFailed++;
    }
  }

  console.log("=== 📊 TEST SUITE SUMMARY ===");
  console.log(` Passed Suites:     ${totalSuitesPassed}`);
  console.log(` Failed Suites:     ${totalSuitesFailed}`);
  console.log(` Total Assertions:  ${totalAssertions}`);

  if (totalSuitesFailed > 0) {
    console.error("❌ TEST SUITE FAILED: Fix runtime regressions before deploying!");
    process.exit(1);
  } else {
    console.log("🎉 ALL AUTOMATED RUNTIME & INTEGRATION TESTS PASSED PERFECTLY!");
    process.exit(0);
  }
}

main();
