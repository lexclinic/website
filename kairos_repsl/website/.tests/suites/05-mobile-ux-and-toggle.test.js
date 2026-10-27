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

  const cardClass = { getAttribute: (k) => (k === 'data-default-recent' ? 'true' : 'class'), style: { display: '' } };
  const cardInterview = { getAttribute: (k) => (k === 'data-default-recent' ? null : 'interview'), style: { display: 'none' } };

  const eventsSandbox = {
    window: {},
    document: {
      addEventListener: () => {},
      getElementById: (id) => {
        if (id === 'recent-three-events-grid') {
          return { contains: (el) => el === cardClass || el === cardInterview };
        }
        return null;
      },
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

  // Filter back to 'all' (in #recent-three-events-grid, only data-default-recent="true" top 3 overall events show)
  eventsSandbox.window.filterEventsByCategory('all', btnAll);
  assert.strictEqual(cardInterview.style.display, 'none', 'Older interview card in recent grid should hide when returning to All overall top-3 view');
  assert.strictEqual(cardClass.style.display, '', 'Top-3 default-recent class card must be visible when filtering by all');
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

  // --------------------------------------------------------------------------
  // Test 5.4: Verify Stateful 3-Token LNA-33X Link -> Nonce Tree Resolver on /nft/index.html
  // --------------------------------------------------------------------------
  const nftHtml = fs.readFileSync(path.join(webDir, 'nft', 'index.html'), 'utf8');
  const scriptMatch = nftHtml.match(/<script>\s*\(function\(\)\s*\{[\s\S]*?<\/script>/);
  assert.ok(scriptMatch, 'nft/index.html must contain inline LNA-33X codec script');
  const nftScriptCode = scriptMatch[0].replace(/^<script>/, '').replace(/<\/script>$/, '');

  const nftElements = {};
  const makeNftEl = (id, val = '') => {
    const el = {
      id,
      value: val,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      listeners: {},
      addEventListener(ev, fn) { this.listeners[ev] = fn; }
    };
    nftElements[id] = el;
    return el;
  };
  [
    'lna-in-hex', 'lna-in-link', 'lna-in-nonce', 'lna-in-ascii',
    'lna-hex-bar', 'lna-disp-link', 'lna-disp-nonce', 'lna-disp-ascii',
    'lna-byte-grid', 'lna-chain-status-box', 'lna-chain-badge',
    'lna-resolved-tree-text', 'lna-chain-explanation', 'lna-svg-container',
    'lna-dec-id-box', 'lna-slot-btn-1', 'lna-slot-btn-2', 'lna-slot-btn-3',
    'lna-active-slot-label'
  ].forEach(id => makeNftEl(id));

  const nftStorage = {};
  const nftSandbox = {
    window: {},
    BigInt,
    parseInt,
    Number,
    String,
    Math,
    Set,
    JSON,
    localStorage: {
      getItem: (k) => nftStorage[k] || null,
      setItem: (k, v) => { nftStorage[k] = String(v); }
    },
    document: {
      readyState: 'complete',
      activeElement: null,
      getElementById: (id) => nftElements[id] || null,
      addEventListener: () => {}
    }
  };
  nftSandbox.window = nftSandbox;
  vm.createContext(nftSandbox);
  vm.runInContext(nftScriptCode, nftSandbox);

  // Default active slot is Token #2 (Link=1 -> Token #1 Nonce=1 -> "b4a8a82b.agent")
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'b4a8a82b.agent', 'Token #2 with Link=1 matching Token #1 Nonce=1 must resolve to b4a8a82b.agent');

  // Switch to Token #3 (Link=2 -> Token #2 Nonce=2 -> Token #1 Nonce=1 -> "subcell.b4a8a82b.agent")
  nftSandbox.window.selectLnaSlot(3);
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'subcell.b4a8a82b.agent', 'Token #3 with Link=2 matching Token #2 Nonce=2 must resolve 3-level chain subcell.b4a8a82b.agent');

  // Point Token #3's Link directly to Token #1's Nonce (Link=1) -> "subcell.agent" (skipping Token #2)
  nftElements['lna-in-link'].value = '1';
  nftElements['lna-in-link'].listeners['input']();
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'subcell.agent', 'Token #3 with Link=1 matching Token #1 Nonce=1 must resolve to subcell.agent');

  // Switch to Token #1 and change Token #1's Nonce from 1 to 9 -> now Token #2 (Link=1) will NOT line up with Token #1 Nonce=9!
  nftSandbox.window.selectLnaSlot(1);
  nftElements['lna-in-nonce'].value = '9';
  nftElements['lna-in-nonce'].listeners['input']();

  // Switch back to Token #2: its inputs (Link=1, Nonce=2, ASCII="b4a8a82b") are remembered, AND because Token #1 Nonce is now 9, Token #2 does NOT append Token #1's ASCII!
  nftSandbox.window.selectLnaSlot(2);
  assert.strictEqual(String(nftElements['lna-in-ascii'].value), 'b4a8a82b', 'Token #2 must remember its ASCII input when switching back');
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'b4a8a82b', 'When Token #1 Nonce (9) does not match Token #2 Link (1), Token #2 must NOT append Token #1 ASCII');
  assert.ok(nftElements['lna-chain-badge'].textContent.includes('Unlinked'), 'Unaligned Link -> Nonce must display Unlinked warning badge');
  assertions += 7;

  console.log(` ✅ SUITE 05 PASSED: ${assertions} assertions verified (Mobile Hamburger Menu, Touch Guard, Category Filter Pills, & Mobile CSS Cascade)!`);
  return { passed: true, assertions };
}

module.exports = { run };
