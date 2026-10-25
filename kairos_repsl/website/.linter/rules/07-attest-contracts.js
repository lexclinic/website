const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 07: Attestation Ledger (/attest/), ERC-7827 (/erc7827/) & Dual-Route Quiz (quiz-learned / quiz-expert) Parity...");

  const violations = [];

  // 1. Verify /erc7827/index.html and /ERC-7827/index.html exist and have IERC7827 interface
  for (const dirName of ["erc7827", "ERC-7827"]) {
    const ercFile = path.join(webDir, dirName, "index.html");
    if (!fs.existsSync(ercFile)) {
      violations.push(`${dirName}/index.html is missing`);
    } else {
      const ercHtml = fs.readFileSync(ercFile, "utf8");
      if (!ercHtml.includes("IERC7827") || !ercHtml.includes("ERC-7827")) {
        violations.push(`${dirName}/index.html is missing IERC7827 specification content`);
      }
      if (ercHtml.includes("status-badge") || ercHtml.includes("hero-badge")) {
        violations.push(`${dirName}/index.html contains redundant status-badge or hero-badge pills`);
      }
    }
  }

  // 2. Verify /attest/index.html exists
  const attestFile = path.join(webDir, "attest", "index.html");
  if (!fs.existsSync(attestFile)) {
    violations.push("attest/index.html is missing");
    console.error(" ❌ RULE 07 FAILED: attest/index.html is missing");
    return false;
  }

  const attestHtml = fs.readFileSync(attestFile, "utf8");

  if (attestHtml.includes("status-badge") || attestHtml.includes("hero-badge")) {
    violations.push("attest/index.html contains redundant status-badge or hero-badge pills");
  }

  // 3. Verify every getElementById(...) in attest/index.html corresponds to an id="..." in the DOM
  const domIds = new Set();
  const idRegex = /\bid=["']([^"']+)["']/g;
  let idMatch;
  while ((idMatch = idRegex.exec(attestHtml)) !== null) {
    domIds.add(idMatch[1]);
  }

  const getIdRegex = /document\.getElementById\(["']([^"']+)["']\)/g;
  let getIdMatch;
  while ((getIdMatch = getIdRegex.exec(attestHtml)) !== null) {
    const targetId = getIdMatch[1];
    if (!domIds.has(targetId)) {
      violations.push(`attest/index.html references document.getElementById('${targetId}') which does not exist in DOM`);
    }
  }

  // 4. Verify Human Review Media Approvals & Notes Ledger section is present on /attest/
  if (!attestHtml.includes("attest-approvals-list") || !attestHtml.includes("/api/media-notes")) {
    violations.push("attest/index.html is missing Human Review Media Approvals & Notes Ledger integration (/api/media-notes)");
  }

  // 5. Extract all quiz entries in CANONICAL_QUIZZES inside attest/index.html
  const quizUrlRegex = /url:\s*["']([^"']+)["']/g;
  const indexedQuizUrls = new Set();
  let urlMatch;
  while ((urlMatch = quizUrlRegex.exec(attestHtml)) !== null) {
    const qUrl = urlMatch[1];
    indexedQuizUrls.add(qUrl);
    const targetPath = path.join(webDir, qUrl);
    if (!fs.existsSync(targetPath)) {
      violations.push(`attest/index.html links to non-existent quiz URL '${qUrl}'`);
    }
  }

  // Extract all alias strings in CANONICAL_QUIZZES
  const indexedAliases = new Set();
  const aliasBlockRegex = /aliases:\s*\[([^\]]+)\]/g;
  let aliasBlockMatch;
  while ((aliasBlockMatch = aliasBlockRegex.exec(attestHtml)) !== null) {
    const strRegex = /["']([^"']+)["']/g;
    let sMatch;
    while ((sMatch = strRegex.exec(aliasBlockMatch[1])) !== null) {
      indexedAliases.add(sMatch[1]);
    }
  }

  // 6. Walk all quiz.html files across /101/, /event/, and /interview/ and verify bidirectional parity + quiz-learned/ + quiz-expert/
  function findQuizFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findQuizFiles(fullPath));
      } else if (entry.name === "quiz.html") {
        results.push(fullPath);
      }
    }
    return results;
  }

  const allQuizFiles = [
    ...findQuizFiles(path.join(webDir, "101")),
    ...findQuizFiles(path.join(webDir, "event")),
    ...findQuizFiles(path.join(webDir, "interview"))
  ];

  for (const qFile of allQuizFiles) {
    const relUrl = "/" + path.relative(webDir, qFile).split(path.sep).join("/");
    const parentDir = path.dirname(qFile);
    const relParent = "/" + path.relative(webDir, parentDir).split(path.sep).join("/");

    if (!indexedQuizUrls.has(relUrl)) {
      violations.push(`Quiz file '${relUrl}' exists on disk but is NOT indexed in /attest/index.html`);
    }

    // Verify quiz-learned/index.html (5 Qs) and quiz-expert/index.html (20 Qs) exist alongside quiz.html
    const learnedFile = path.join(parentDir, "quiz-learned", "index.html");
    const expertFile = path.join(parentDir, "quiz-expert", "index.html");

    if (!fs.existsSync(learnedFile)) {
      violations.push(`${relParent}/quiz-learned/index.html (5-Q Learned Quiz) is missing`);
    } else {
      const lHtml = fs.readFileSync(learnedFile, "utf8");
      const lQs = new Set((lHtml.match(/name=["']q\d+["']/g) || []));
      if (lQs.size !== 5) {
        violations.push(`${relParent}/quiz-learned/index.html must have exactly 5 radio question groups (found ${lQs.size})`);
      }
      if (!lHtml.includes("openMediaCommentModal") || !lHtml.includes("openMediaApprovalModal")) {
        violations.push(`${relParent}/quiz-learned/index.html is missing 💬 Notes or 👍 Approval review buttons`);
      }
      if (lHtml.includes("copyCardDirectLink")) {
        violations.push(`${relParent}/quiz-learned/index.html must NOT include Copy Direct Link button (quiz has its own URL)`);
      }
    }

    if (!fs.existsSync(expertFile)) {
      violations.push(`${relParent}/quiz-expert/index.html (20-Q Expert Quiz) is missing`);
    } else {
      const eHtml = fs.readFileSync(expertFile, "utf8");
      const eQs = new Set((eHtml.match(/name=["']q\d+["']/g) || []));
      if (eQs.size !== 20) {
        violations.push(`${relParent}/quiz-expert/index.html must have exactly 20 radio question groups (found ${eQs.size})`);
      }
      if (!eHtml.includes("openMediaCommentModal") || !eHtml.includes("openMediaApprovalModal")) {
        violations.push(`${relParent}/quiz-expert/index.html is missing 💬 Notes or 👍 Approval review buttons`);
      }
      if (eHtml.includes("copyCardDirectLink")) {
        violations.push(`${relParent}/quiz-expert/index.html must NOT include Copy Direct Link button (quiz has its own URL)`);
      }
    }

    const qHtml = fs.readFileSync(qFile, "utf8");
    if (!qHtml.includes("/api/submit-quiz")) {
      violations.push(`Quiz file '${relUrl}' does not submit to /api/submit-quiz`);
    }
    if (!qHtml.includes("payload_hash")) {
      violations.push(`Quiz file '${relUrl}' is missing cryptographic payload_hash field`);
    }
    if (!qHtml.includes("lexclinic_quiz_submissions")) {
      violations.push(`Quiz file '${relUrl}' does not persist submission to localStorage 'lexclinic_quiz_submissions'`);
    }

    const classIdMatch = qHtml.match(/CLASS_ID\s*=\s*["']([^"']+)["']/) || qHtml.match(/class_id\s*:\s*["']([^"']+)["']/);
    if (!classIdMatch) {
      violations.push(`Quiz file '${relUrl}' is missing explicit CLASS_ID / class_id property in submission payload`);
    } else {
      const cid = classIdMatch[1];
      if (!indexedAliases.has(cid)) {
        violations.push(`Quiz file '${relUrl}' submits class_id '${cid}' which is not matched in /attest/index.html aliases`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 07 FAILED: Attestation & Dual-Route Quiz contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 07 PASSED: /attest/, /erc7827/, and all ${allQuizFiles.length} Dual-Route Quizzes (quiz-learned 5-Q + quiz-expert 20-Q + Notes/Approval bars) verified!`);
  return true;
}

module.exports = { run };
