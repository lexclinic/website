const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 03: Route Integrity (URL Resolution Verification)...");

  let redirectsText = "";
  const redirectsFile = path.join(webDir, "_redirects");
  if (fs.existsSync(redirectsFile)) {
    redirectsText = fs.readFileSync(redirectsFile, "utf8");
  }

  const missingRoutes = [];

  function checkHref(href, sourceFile) {
    if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.includes("${")) {
      return; // Skip external, hash, dynamic JS templates, or protocol links
    }

    let cleanPath = href.split("?")[0].split("#")[0];
    if (!cleanPath) return;

    // Check if covered by _redirects rule
    if (redirectsText.includes(cleanPath)) {
      return;
    }

    let targetFile = "";
    if (cleanPath.startsWith("/")) {
      // Absolute path from webDir root
      targetFile = path.join(webDir, cleanPath);
    } else {
      // Relative path from source file's directory
      const sourceDir = path.dirname(sourceFile);
      targetFile = path.join(sourceDir, cleanPath);
    }

    if (cleanPath.endsWith("/")) {
      targetFile = path.join(targetFile, "index.html");
    } else if (!path.extname(cleanPath)) {
      if (fs.existsSync(path.join(targetFile, "index.html"))) {
        targetFile = path.join(targetFile, "index.html");
      } else if (fs.existsSync(targetFile + ".html")) {
        targetFile = targetFile + ".html";
      }
    }

    if (!fs.existsSync(targetFile)) {
      missingRoutes.push({ href, file: path.relative(webDir, sourceFile) });
    }
  }

  function scanHtmlRoutes(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanHtmlRoutes(full);
      } else if (f.endsWith(".html")) {
        const html = fs.readFileSync(full, "utf8");
        const hrefs = html.match(/href=["'](.*?)["']/g) || [];
        for (const h of hrefs) {
          const val = h.match(/href=["'](.*?)["']/)[1];
          checkHref(val, full);
        }
      }
    }
  }

  scanHtmlRoutes(webDir);

  if (missingRoutes.length > 0) {
    console.error(" ❌ RULE 03 FAILED: Broken internal URL route links detected:");
    missingRoutes.forEach(m => console.error(`    - Broken Href '${m.href}' in ${m.file}`));
    return false;
  }

  console.log(" ✅ RULE 03 PASSED: 100% of internal URL href links resolve to valid HTML files or _redirects rules!");
  return true;
}

module.exports = { run };
