const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

async function run(webDir) {
  console.log(" 🧪 Executing Suite 05: Mobile Hamburger Menu, Category Filter & Responsive CSS Tests...");
  let assertions = 0;

  // --------------------------------------------------------------------------
  // Test 5.1: Mobile Hamburger Toggle State Machine (bindMobileToggle)
  // --------------------------------------------------------------------------
  const navClasses = new Set();
  const btnClasses = new Set();

  const toggleBtn = {
    id: 'mobile-toggle',
    innerHTML: '☰',
    onclick: null,
    ontouchend: null,
    classList: {
      toggle: (c) => {
        if (btnClasses.has(c)) { btnClasses.delete(c); return false; }
        btnClasses.add(c); return true;
      },
      contains: (c) => btnClasses.has(c)
    }
  };

  const navLinks = {
    id: 'nav-links',
    classList: {
      toggle: (c) => {
        if (navClasses.has(c)) { navClasses.delete(c); return false; }
        navClasses.add(c); return true;
      },
      contains: (c) => navClasses.has(c),
      remove: (c) => navClasses.delete(c)
    }
  };

  const localStorageMock = {
    getItem: () => String(Date.now()), // pre-acknowledged disclaimer
    setItem: () => {}
  };

  const sandbox = {
    window: {},
    document: {
      readyState: 'complete',
      getElementById: (id) => {
        if (id === 'mobile-toggle') return toggleBtn;
        if (id === 'nav-links') return navLinks;
        return null;
      },
      querySelector: () => null,
      createElement: () => ({ style: {} }),
      body: { appendChild: () => {} }
    },
    localStorage: localStorageMock,
    Date: Date,
    parseInt: parseInt
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const uiCode = fs.readFileSync(path.join(webDir, 'js/modules/ui-interactive-controls.js'), 'utf8');
  vm.runInContext(uiCode, sandbox);

  assert.strictEqual(typeof toggleBtn.onclick, 'function', '#mobile-toggle onclick handler must be bound');
  assert.strictEqual(toggleBtn.ontouchend, null, '#mobile-toggle ontouchend must NOT be bound to onclick (prevents double-tap auto-close bug on mobile)');
  assertions += 2;

  // Tap 1: Open Mobile Menu
  toggleBtn.onclick({ preventDefault: () => {}, stopPropagation: () => {} });
  assert.strictEqual(navClasses.has('active'), true, 'First tap on #mobile-toggle must add .active class to #nav-links');
  assert.strictEqual(toggleBtn.innerHTML, '✕', 'First tap on #mobile-toggle must switch icon to ✕');
  assertions += 2;

  // Tap 2: Close Mobile Menu
  toggleBtn.onclick({ preventDefault: () => {}, stopPropagation: () => {} });
  assert.strictEqual(navClasses.has('active'), false, 'Second tap on #mobile-toggle must remove .active class from #nav-links');
  assert.strictEqual(toggleBtn.innerHTML, '☰', 'Second tap on #mobile-toggle must restore icon to ☰');
  assertions += 2;

  // --------------------------------------------------------------------------
  // Test 5.2: Event Category Filter Pills (filterEventsByCategory) on Mobile/Desktop
  // --------------------------------------------------------------------------
  const btnAll = { getAttribute: () => 'all', style: {} };
  const btnClass = { getAttribute: () => 'class', style: {} };
  const btnInterview = { getAttribute: () => 'interview', style: {} };

  const cardClass = { getAttribute: () => 'class', style: { display: '' } };
  const cardInterview = { getAttribute: () => 'interview', style: { display: '' } };

  const eventsSandbox = {
    window: {},
    document: {
      addEventListener: () => {},
      querySelectorAll: (sel) => {
        if (sel === '.event-cat-filter-btn') return [btnAll, btnClass, btnInterview];
        if (sel === '[data-event-category]') return [cardClass, cardInterview];
        return [];
      }
    }
  };
  eventsSandbox.window = eventsSandbox;
  vm.createContext(eventsSandbox);

  const eventsCode = fs.readFileSync(path.join(webDir, 'events.js'), 'utf8');
  vm.runInContext(eventsCode, eventsSandbox);

  // Filter to 'interview' only
  eventsSandbox.window.filterEventsByCategory('interview', btnInterview);
  assert.strictEqual(cardInterview.style.display, '', 'Interview card must remain visible when filtering by interview');
  assert.strictEqual(cardClass.style.display, 'none', 'Class card must be hidden when filtering by interview');
  assert.strictEqual(btnInterview.style.fontWeight, '800', 'Selected filter pill must have bold 800 weight');
  assertions += 3;

  // Filter back to 'all'
  eventsSandbox.window.filterEventsByCategory('all', btnAll);
  assert.strictEqual(cardInterview.style.display, '', 'Interview card must be visible when filtering by all');
  assert.strictEqual(cardClass.style.display, '', 'Class card must be visible when filtering by all');
  assertions += 2;

  // --------------------------------------------------------------------------
  // Test 5.3: Verify Mobile CSS Breakpoint Cascade in styles.css
  // --------------------------------------------------------------------------
  const css = fs.readFileSync(path.join(webDir, 'styles.css'), 'utf8');
  const finalMediaBlock = css.slice(css.lastIndexOf('@media (max-width: 768px)'));
  assert.ok(finalMediaBlock.includes('display: none !important;'), 'Final mobile @media block must hide desktop .nav-links with !important');
  assert.ok(finalMediaBlock.includes('.nav-links.active') && finalMediaBlock.includes('display: flex !important;'), 'Final mobile @media block must display .nav-links.active dropdown with !important');
  assert.ok(finalMediaBlock.includes('grid-template-columns: 1fr !important;'), 'Final mobile @media block must collapse .grid-2 and .grid-3 to 1fr single column');
  assertions += 3;

  console.log(` ✅ SUITE 05 PASSED: ${assertions} assertions verified (Mobile Hamburger Menu, Touch Guard, Category Filter Pills, & Mobile CSS Cascade)!`);
  return { passed: true, assertions };
}

module.exports = { run };
