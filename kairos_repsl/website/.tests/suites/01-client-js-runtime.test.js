const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function createSimulatedBrowserEnv(initialPath = '/101/3.1/') {
  const store = {};
  const elementsById = {};
  const elementsByClass = {};
  const bodyChildren = [];
  const bodyClasses = new Set();
  const dispatchedEvents = [];
  const fetchCalls = [];

  function makeElement(tag = 'div', id = '', className = '') {
    const el = {
      tagName: tag.toUpperCase(),
      id: id,
      className: className,
      innerText: '',
      innerHTML: '',
      value: '',
      style: {},
      classList: {
        add: (c) => bodyClasses.add(c),
        remove: (c) => bodyClasses.delete(c),
        toggle: (c) => {
          if (bodyClasses.has(c)) { bodyClasses.delete(c); return false; }
          bodyClasses.add(c); return true;
        },
        contains: (c) => bodyClasses.has(c)
      },
      remove: function() {
        if (this.id && elementsById[this.id] === this) {
          delete elementsById[this.id];
        }
      },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    if (id) elementsById[id] = el;
    if (className) elementsByClass[className] = el;
    return el;
  }

  // Pre-populate standard navbar & card buttons
  const navBtn = makeElement('a', 'nav-login-btn', '');
  const toggleBtn = makeElement('button', 'mobile-toggle', '');
  const navLinks = makeElement('nav', 'nav-links', '');
  const approvalBtn = makeElement('button', '', 'btn-approval-card_interview_lucas_v1_1');
  const commentBtn = makeElement('button', '', 'btn-comment-card_interview_lucas_v1_1');

  const localStorageMock = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  let mockServerLedger = {
    status: 'success',
    total_approvals: 0,
    total_notes: 0,
    approvals: {},
    notes: []
  };

  const windowObj = {
    location: { pathname: initialPath, href: 'https://stage.lex.clinic' + initialPath },
    localStorage: localStorageMock,
    document: null,
    CustomEvent: function(name, opts) { this.type = name; this.detail = opts ? opts.detail : null; },
    addEventListener: () => {},
    dispatchEvent: (evt) => { dispatchedEvents.push(evt); },
    setTimeout: (fn) => { fn(); return 1; },
    alert: () => {},
    fetch: async (url, opts = {}) => {
      fetchCalls.push({ url, opts });
      if (opts.method === 'POST' && url === '/api/media-notes') {
        const body = JSON.parse(opts.body || '{}');
        const items = Array.isArray(body.items) ? body.items : [body];
        items.forEach(it => {
          if (it.rating) {
            mockServerLedger.approvals[it.uid || it.card_id] = it;
          }
          if (it.comment) {
            mockServerLedger.notes.push(it);
          }
        });
        mockServerLedger.total_approvals = Object.keys(mockServerLedger.approvals).length;
        mockServerLedger.total_notes = mockServerLedger.notes.length;
      }
      return {
        ok: true,
        status: 200,
        json: async () => mockServerLedger
      };
    }
  };

  const documentObj = {
    readyState: 'complete',
    fullscreenElement: null,
    body: {
      classList: {
        add: (c) => bodyClasses.add(c),
        remove: (c) => bodyClasses.delete(c),
        contains: (c) => bodyClasses.has(c)
      },
      appendChild: (el) => {
        bodyChildren.push(el);
        if (el.id) elementsById[el.id] = el;
      }
    },
    createElement: (tag) => makeElement(tag),
    getElementById: (id) => elementsById[id] || null,
    querySelector: (sel) => {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return elementsByClass[cls] || null;
      }
      if (sel.startsWith('#')) {
        return elementsById[sel.slice(1)] || null;
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '#nav-login-btn') return [navBtn];
      return [];
    },
    addEventListener: () => {}
  };

  windowObj.document = documentObj;

  const sandbox = {
    window: windowObj,
    document: documentObj,
    localStorage: localStorageMock,
    CustomEvent: windowObj.CustomEvent,
    fetch: windowObj.fetch,
    setTimeout: windowObj.setTimeout,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Set: Set,
     RegExp: RegExp,
    parseInt: parseInt,
    console: { log: () => {}, error: () => {} }
  };

  vm.createContext(sandbox);

  return {
    sandbox,
    windowObj,
    documentObj,
    localStorageMock,
    elementsById,
    elementsByClass,
    bodyClasses,
    fetchCalls,
    mockServerLedger,
    makeElement
  };
}

async function run(webDir) {
  console.log(" 🧪 Executing Suite 01: Client JS Runtime & State Machine Unit Tests...");
  let assertions = 0;

  const env = createSimulatedBrowserEnv('/interview/lucas-kung/');

  // Load client JS modules into the VM sandbox
  const modulesToLoad = [
    'js/modules/auth-core.js',
    'js/modules/ui-interactive-controls.js',
    'js/modules/media-comments-approval.js'
  ];

  for (const relPath of modulesToLoad) {
    const code = fs.readFileSync(path.join(webDir, relPath), 'utf8');
    vm.runInContext(code, env.sandbox, { filename: relPath });
  }

  // Test 1.1: Logged-out initial state
  env.windowObj.updateAuthUI();
  assert.strictEqual(env.windowObj.getSanitizedEmail(), '', 'Initial email should be empty');
  assert.strictEqual(env.bodyClasses.has('auth-logged-in'), false, 'Body should not have auth-logged-in class when logged out');
  assertions += 2;

  // Test 1.2: Instant login with @lex.clinic fiduciary email
  const loginRes = env.windowObj.processInstantLogin('  Kyle@Lex.Clinic ');
  assert.strictEqual(loginRes, true, 'processInstantLogin should succeed for valid email');
  assert.strictEqual(env.windowObj.getSanitizedEmail(), 'kyle@lex.clinic', 'Email should be lowercased and trimmed');
  assert.strictEqual(env.bodyClasses.has('auth-logged-in'), true, 'Body should have auth-logged-in class after login');
  assert.strictEqual(env.elementsById['nav-login-btn'].innerText, '👤 kyle', 'Navbar login button should show username');
  assertions += 4;

  // Test 1.3: 24-Hour Disclaimer Splash Modal lifecycle
  env.localStorageMock.removeItem('lexclinic_disclaimer_ack');
  if (env.elementsById['disclaimer-splash-modal']) {
    env.elementsById['disclaimer-splash-modal'].remove();
  }
  env.windowObj.checkDisclaimerSplash();
  assert.ok(env.elementsById['disclaimer-splash-modal'], 'Disclaimer modal should mount when unacknowledged');
  env.windowObj.acknowledgeDisclaimer();
  assert.strictEqual(env.elementsById['disclaimer-splash-modal'], undefined, 'Disclaimer modal should unmount after acknowledgment');
  const ackTs = parseInt(env.localStorageMock.getItem('lexclinic_disclaimer_ack'), 10);
  assert.ok(ackTs > 0, 'lexclinic_disclaimer_ack timestamp should be stored in localStorage');

  // Re-running checkDisclaimerSplash within 24h should NOT mount modal
  env.windowObj.checkDisclaimerSplash();
  assert.strictEqual(env.elementsById['disclaimer-splash-modal'], undefined, 'Disclaimer modal must not remount within 24 hours');
  assertions += 4;

  // Test 1.4: Two-Step Media Approval State Machine (Step 1: Thorough/Cursory -> Step 2: Pass/Star/Flag/Fail)
  env.windowObj.openMediaApprovalModal('card_interview_lucas_v1_1');
  assert.ok(env.elementsById['media-approval-modal'], 'Approval modal should open for logged-in user');
  assert.ok(env.elementsById['media-approval-modal'].innerHTML.includes('Step 1: Human Review Scope'), 'Step 1 should prompt for review scope');

  env.windowObj.selectApprovalDepth('card_interview_lucas_v1_1', 'thorough');
  assert.ok(env.elementsById['media-approval-modal'].innerHTML.includes('Step 2: Assign Evaluation Rating'), 'Step 2 should prompt for rating');

  env.windowObj.setMediaApproval('card_interview_lucas_v1_1', 'star');
  const savedApprovals = JSON.parse(env.localStorageMock.getItem('lexclinic_media_approvals') || '{}');
  const canonicalUid = '/interview/lucas-kung/#card_interview_lucas_v1_1';
  assert.ok(savedApprovals[canonicalUid], 'Approval should be saved under canonical UID');
  assert.strictEqual(savedApprovals[canonicalUid].rating, 'star', 'Rating should be star');
  assert.strictEqual(savedApprovals[canonicalUid].depth, 'thorough', 'Depth should be thorough');
  assert.strictEqual(savedApprovals[canonicalUid].reviewer, 'kyle@lex.clinic', 'Reviewer should be kyle@lex.clinic');
  assert.strictEqual(env.elementsByClass['btn-approval-card_interview_lucas_v1_1'].innerHTML, '⭐ Starred (Full)', 'Approval button UI should update to Starred (Full)');
  assertions += 8;

  // Test 1.5: Legacy Card ID Alias Resolution (approving 'lucas-kung-interview-clip-1' updates 'card_interview_lucas_v1_1')
  env.windowObj.updateApprovalButtonUI('lucas-kung-interview-clip-1', { rating: 'pass', depth: 'cursory' });
  assert.strictEqual(
    env.elementsByClass['btn-approval-card_interview_lucas_v1_1'].innerHTML,
    '✅ Passed (Partial)',
    'Legacy card ID alias should update corresponding current card button UI'
  );
  assertions += 1;

  // Test 1.6: Community Discussion Note Posting & Auto-Sync to Shared Server Ledger
  const textarea = env.makeElement('textarea', 'media-comment-textarea', '');
  textarea.value = 'Verified Swiss Verein vs Delaware LLC liability shield analysis.';
  env.makeElement('div', 'media-comment-modal', '');
  env.windowObj.saveMediaComment('card_interview_lucas_v1_1');

  const savedNotes = JSON.parse(env.localStorageMock.getItem('lexclinic_notes_history') || '{}');
  assert.ok(Array.isArray(savedNotes[canonicalUid]) && savedNotes[canonicalUid].length === 1, 'Note should be saved under canonical UID in lexclinic_notes_history');
  assert.strictEqual(env.elementsByClass['btn-comment-card_interview_lucas_v1_1'].innerHTML, '💬 Notes (1)', 'Notes button UI should display count (1)');

  await env.windowObj.syncAndHydrateMediaLedger();
  assert.ok(env.mockServerLedger.total_approvals >= 1, 'syncAndHydrateMediaLedger should push localStorage approvals to /api/media-notes');
  assert.ok(env.mockServerLedger.total_notes >= 1, 'syncAndHydrateMediaLedger should push localStorage notes to /api/media-notes');
  const hydratedWatch = JSON.parse(env.localStorageMock.getItem('lexclinic_video_watch_history') || '{}');
  assert.ok(hydratedWatch['card_interview_lucas_v1_1'] && hydratedWatch['card_interview_lucas_v1_1'].progress === 100, 'Approved thorough media card must automatically hydrate watch history to 100% Watched');
  assertions += 5;

  console.log(` ✅ SUITE 01 PASSED: ${assertions} assertions verified (Auth, 24h Disclaimer, 2-Step Approvals, Legacy Aliases, Notes Sync)!`);
  return { passed: true, assertions };
}

module.exports = { run };
