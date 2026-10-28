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
  // Test 5.4: Verify Stateful 6-Token SeedTree LNA-33X (Link-as-.) Resolver on /nft/index.html
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
    'lna-slot-btn-4', 'lna-slot-btn-5', 'lna-slot-btn-6',
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

  // Default active slot is Token #6 (Nonce=6, Link=4 -> Nonce 4 "np", Link=3 -> Nonce 3 "$1", Link=1 -> Nonce 1 "agent" => "agent.$1.np.$1")
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'agent.$1.np.$1', 'Token #6 must resolve 4-level Link-as-Dot SeedTree path agent.$1.np.$1');
  assert.ok(nftElements['lna-svg-container'].innerHTML.includes('[SIDE 1/3: LNA-33X SEEDTREE TILE]') && nftElements['lna-svg-container'].innerHTML.includes('[SIDE 3/3: ON-CHAIN SEEDTREE ORACLE]'), 'SVG preview must render 3-sided SMIL-animated SeedTree SVG');

  // Switch to Token #4 (Nonce=4, Link=3, ASCII="np" => "agent.$1.np")
  nftSandbox.window.selectLnaSlot(4);
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'agent.$1.np', 'Token #4 must resolve to agent.$1.np');

  // Verify dots ('.') are automatically stripped from the 26-byte ASCII input (require(b[i] != 0x2e))
  nftElements['lna-in-ascii'].value = 'np.bad';
  nftElements['lna-in-ascii'].listeners['input']();
  assert.strictEqual(String(nftElements['lna-in-ascii'].value), 'npbad', 'Dots (.) must be stripped from 26-byte ASCII input because Link IS the dot separator');

  // Switch to Token #3 and change its Nonce from 3 to 9 -> now Token #4 (Link=3) will NOT line up with Token #3 Nonce=9!
  nftSandbox.window.selectLnaSlot(3);
  nftElements['lna-in-nonce'].value = '9';
  nftElements['lna-in-nonce'].listeners['input']();

  // Switch back to Token #4: its ASCII ("npbad") is remembered, AND because no token has Nonce=3 anymore, it does NOT prepend parent ASCII!
  nftSandbox.window.selectLnaSlot(4);
  assert.strictEqual(String(nftElements['lna-in-ascii'].value), 'npbad', 'Token #4 must remember its edited ASCII input when switching back');
  assert.strictEqual(nftElements['lna-resolved-tree-text'].textContent, 'npbad', 'When Link (3) matches no preceding Token Nonce, only the token own ASCII renders');
  assert.ok(nftElements['lna-chain-badge'].textContent.includes('Unlinked'), 'Unaligned Link -> Nonce must display Unlinked warning badge');

  // Verify Link must be at least 1 less than Nonce (Token #4 has Nonce=4; attempting to set Link=4 or Link=9 must clamp Link to Nonce - 1 = 3)
  nftElements['lna-in-link'].value = '4';
  nftElements['lna-in-link'].listeners['input']();
  assert.strictEqual(Number(nftElements['lna-in-link'].value), 3, 'Link input must be clamped to at most Nonce - 1 (3 when Nonce is 4)');
  assertions += 9;

  console.log(` ✅ SUITE 05 PASSED: ${assertions} assertions verified (Mobile Hamburger Menu, Touch Guard, Category Filter Pills, & Mobile CSS Cascade)!`);
  return { passed: true, assertions };
}

module.exports = { run };
