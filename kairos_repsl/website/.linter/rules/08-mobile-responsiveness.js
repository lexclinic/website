const fs = require('fs');
const path = require('path');

function run(webDir, config) {
  console.log(" 🔍 Executing Rule 08: Mobile Responsiveness, Viewport Meta, Hamburger Nav & Overflow Protection...");

  const violations = [];

  // 1. Verify styles.css contains mandatory @media (max-width: 768px) mobile overrides
  const stylesPath = path.join(webDir, "styles.css");
  if (!fs.existsSync(stylesPath)) {
    violations.push("styles.css is missing");
  } else {
    const css = fs.readFileSync(stylesPath, "utf8");
    const lastMediaIdx = css.lastIndexOf("@media (max-width: 768px)");
    const afterFinalMedia = lastMediaIdx !== -1 ? css.slice(lastMediaIdx) : "";
    const closeBraceIdx = afterFinalMedia.lastIndexOf("}");
    const trailingCss = closeBraceIdx !== -1 ? afterFinalMedia.slice(closeBraceIdx + 1) : "";
    if (lastMediaIdx === -1) {
      violations.push("styles.css is missing @media (max-width: 768px) mobile breakpoint block");
    } else if (trailingCss.includes(".nav-links")) {
      violations.push("styles.css has desktop .nav-links rules AFTER the final @media (max-width: 768px) block, which overrides mobile menu hiding!");
    }
    if (!css.includes("grid-template-columns: 1fr !important")) {
      violations.push("styles.css is missing single-column mobile grid override (grid-template-columns: 1fr !important)");
    }
    if (!css.includes("overflow-x: hidden")) {
      violations.push("styles.css is missing body overflow-x: hidden mobile horizontal scroll protection");
    }
  }

  // 2. Verify bindMobileToggle in ui-interactive-controls.js does NOT double-bind ontouchend = onclick
  const uiControlsPath = path.join(webDir, "js/modules/ui-interactive-controls.js");
  if (fs.existsSync(uiControlsPath)) {
    const uiCode = fs.readFileSync(uiControlsPath, "utf8");
    if (uiCode.includes("ontouchend = toggleBtn.onclick")) {
      violations.push("js/modules/ui-interactive-controls.js binds ontouchend = toggleBtn.onclick, which double-fires on mobile touch and immediately closes the menu!");
    }
  }

  // 3. Scan all HTML files for mobile viewport meta tag, #mobile-toggle, #nav-links, and rigid inline min-width > 340px
  function findAllHtml(dir) {
    let res = [];
    if (!fs.existsSync(dir)) return res;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        res = res.concat(findAllHtml(full));
      } else if (entry.name.endsWith(".html")) {
        res.push(full);
      }
    }
    return res;
  }

  const allHtmlFiles = findAllHtml(webDir);
  for (const hFile of allHtmlFiles) {
    const rel = "/" + path.relative(webDir, hFile).split(path.sep).join("/");
    const html = fs.readFileSync(hFile, "utf8");

    // Must have responsive viewport meta tag
    if (!html.includes('name="viewport"') || !html.includes("width=device-width")) {
      violations.push(`${rel} is missing responsive <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
    }

    // Every page with a .navbar must have #mobile-toggle and #nav-links
    if (html.includes('class="navbar"')) {
      if (!html.includes('id="mobile-toggle"')) {
        violations.push(`${rel} has a .navbar but is missing #mobile-toggle button for mobile devices`);
      }
      if (!html.includes('id="nav-links"')) {
        violations.push(`${rel} has a .navbar but is missing #nav-links container for mobile menu dropdown`);
      }
    }

    // Check for rigid inline min-width: Npx where N > 340 (causes horizontal overflow on 360px/375px mobile screens)
    const minWidthRegex = /min-width:\s*(\d+)px/gi;
    let mwMatch;
    while ((mwMatch = minWidthRegex.exec(html)) !== null) {
      const px = parseInt(mwMatch[1], 10);
      if (px > 340) {
        violations.push(`${rel} contains rigid inline 'min-width: ${px}px' (> 340px), which overflows 360px/375px mobile viewports`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(" ❌ RULE 08 FAILED: Mobile responsiveness contract violations detected:");
    violations.forEach(v => console.error(`    - ${v}`));
    return false;
  }

  console.log(` ✅ RULE 08 PASSED: All ${allHtmlFiles.length} HTML pages & styles.css verified for mobile responsiveness (viewport meta, hamburger nav, CSS media cascade, and zero rigid >340px widths)!`);
  return true;
}

module.exports = { run };
