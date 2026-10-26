const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

function createQuizSandbox(selectedAnswers = {}, userEmail = 'kyle@lex.clinic', initialStore = {}) {
  const store = { lexclinic_user_email: userEmail, ...initialStore };
  const elementsById = {};
  const submittedPayloads = [];
  let currentPathname = '/101/6.2/quiz.html';

  function makeEl(id) {
    const el = {
      id,
      innerText: '',
      innerHTML: '',
      style: { display: 'none', borderColor: '', color: '' },
      disabled: false,
      scrollIntoView: () => {},
      checkValidity: () => true,
      reportValidity: () => {},
      querySelectorAll: () => [{ setAttribute: () => {} }],
      querySelector: (sel) => {
        const mRadio = sel.match(/input\[name="q(\d+)"\]:checked/);
        if (mRadio) {
          const qNum = mRadio[1];
          const val = selectedAnswers['q' + qNum];
          return val ? { value: val } : null;
        }
        const mVal = sel.match(/input\[name="q(\d+)"\]\[value="([A-C])"\]/);
        if (mVal) {
          return { checked: false };
        }
        if (sel.includes('quiz-question-card')) {
          return { style: { borderColor: '' } };
        }
        return null;
      }
    };
    elementsById[id] = el;
    return el;
  }

  const commonIds = [
    'quiz-form', 'quiz-results', 'score-text',
    'quiz-61-form', 'quiz-62-form', 'quiz-42-form', 'quiz-51-form', 'quiz-52-form',
    'lucas-quiz-form', 'sept24-quiz-form',
    'mastery-questions-container', 'quiz-stage-heading', 'quiz-stage-subtext',
    'submit-quiz-btn', 'quiz-submit-btn', 'unlock-20q-offer-box',
    'quiz-result-card', 'quiz-result-title', 'quiz-score-summary', 'quiz-hash-box', 'quiz-payload-hash',
    'prior-completion-banner', 'prior-completion-title', 'prior-completion-text', 'expert-prerequisite-lock-banner'
  ];
  commonIds.forEach(id => makeEl(id));

  const localStorageMock = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const windowObj = {
    localStorage: localStorageMock,
    location: {
      get pathname() { return currentPathname; },
      set pathname(v) { currentPathname = v; }
    },
    history: {
      replaceState: (_state, _title, newUrl) => { currentPathname = newUrl; }
    },
    getSanitizedEmail: () => userEmail,
    scrollTo: () => {},
    crypto: crypto.webcrypto
  };

  const documentObj = {
    getElementById: (id) => elementsById[id] || makeEl(id),
    querySelector: () => ({ scrollIntoView: () => {}, style: {} }),
    addEventListener: () => {}
  };

  const sandbox = {
    window: windowObj,
    document: documentObj,
    localStorage: localStorageMock,
    crypto: crypto.webcrypto,
    TextEncoder: TextEncoder,
    Uint8Array: Uint8Array,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Math: Math,
    Date: Date,
    JSON: JSON,
    encodeURIComponent: encodeURIComponent,
    console: { log: () => {}, error: () => {} },
    fetch: async (url, opts = {}) => {
      if (url === '/api/submit-quiz' && opts.body) {
        submittedPayloads.push(JSON.parse(opts.body));
      }
      if (url.startsWith('/api/user-attest')) {
        return { ok: true, status: 200, json: async () => ({ success: true, submissions: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    }
  };

  windowObj.fetch = sandbox.fetch;
  vm.createContext(sandbox);
  return { sandbox, windowObj, elementsById, localStorageMock, submittedPayloads };
}

async function run(webDir) {
  console.log(" 🧪 Executing Suite 02: Dual-Route Quiz Engine (quiz-learned 5-Q / quiz-expert 20-Q) & Attestation Tests...");
  let assertions = 0;

  // --------------------------------------------------------------------------
  // Test 2.1: 5-Question Learned Quiz (/101/6.2/quiz-learned/index.html)
  // --------------------------------------------------------------------------
  const q62LearnedHtml = fs.readFileSync(path.join(webDir, '101/6.2/quiz-learned/index.html'), 'utf8');
  const script62Learned = q62LearnedHtml.split('<script>').pop().split('</script>')[0];

  // Case A: Failing Learned Check (2/5 correct) -> Does NOT emit hash or unlock Expert
  const answersFail = { q1: 'A', q2: 'A', q3: 'B', q4: 'C', q5: 'B' };
  const envFail = createQuizSandbox(answersFail, 'kyle@lex.clinic');
  vm.runInContext(script62Learned, envFail.sandbox);
  await envFail.windowObj.submitQuiz({ preventDefault: () => {} });

  assert.strictEqual(envFail.submittedPayloads.length, 0, 'Failing Learned Quiz (2/5) must not submit attestation to /api/submit-quiz');
  assert.strictEqual(envFail.elementsById['unlock-20q-offer-box'].style.display, 'none', 'Failing Learned Quiz must not display 20-Q Expert offer');
  assertions += 2;

  // Case B: Passing Learned Check (5/5 correct) -> Emits Learned Attestation + Offers /101/6.2/quiz-expert/
  const answersPass = {};
  for (let i = 1; i <= 20; i++) answersPass['q' + i] = 'A';
  const envLearnedPass = createQuizSandbox(answersPass, 'kyle@lex.clinic');
  vm.runInContext(script62Learned, envLearnedPass.sandbox);
  await envLearnedPass.windowObj.submitQuiz({ preventDefault: () => {} });

  assert.strictEqual(envLearnedPass.submittedPayloads.length, 1, 'Passing 5-Q Learned Quiz must submit Learned Attestation');
  assert.strictEqual(envLearnedPass.submittedPayloads[0].class_id, '6.2', 'Learned Attestation class_id must be 6.2');
  assert.strictEqual(envLearnedPass.submittedPayloads[0].tier, 'learned', 'Learned Attestation tier must be learned');
  assert.strictEqual(envLearnedPass.submittedPayloads[0].score, '5/5', 'Learned Attestation score must be 5/5');
  assert.strictEqual(envLearnedPass.elementsById['unlock-20q-offer-box'].style.display, 'block', 'Passing 5-Q Learned Quiz must display 20-Q Expert offer box');
  assertions += 5;

  // --------------------------------------------------------------------------
  // Test 2.2: Smart Re-Entry (/101/6.2/quiz.html) After Passing 5-Q Learned Quiz
  // Automatically Unlocks 20-Q Expert Quiz & Updates URL to /101/6.2/quiz-expert/
  // --------------------------------------------------------------------------
  const q62SmartHtml = fs.readFileSync(path.join(webDir, '101/6.2/quiz.html'), 'utf8');
  const script62Smart = q62SmartHtml.split('<script>').pop().split('</script>')[0];

  const savedSubsJson = envLearnedPass.localStorageMock.getItem('lexclinic_quiz_submissions');
  const savedAnswersJson = envLearnedPass.localStorageMock.getItem('lexclinic_quiz_answers_6.2');

  const envReentry = createQuizSandbox(answersPass, 'kyle@lex.clinic', {
    lexclinic_quiz_submissions: savedSubsJson,
    'lexclinic_quiz_answers_6.2': savedAnswersJson
  });
  vm.runInContext(script62Smart, envReentry.sandbox);

  assert.strictEqual(envReentry.elementsById['prior-completion-banner'].style.display, 'block', 'Re-entering /101/6.2/quiz after passing 5/5 must show prior completion banner');
  assert.strictEqual(envReentry.elementsById['mastery-questions-container'].style.display, 'block', 'Re-entering /101/6.2/quiz after passing 5/5 must automatically unlock 20-Question Expert Quiz');
  assert.strictEqual(envReentry.windowObj.location.pathname, '/101/6.2/quiz-expert/', 'Re-entering /101/6.2/quiz after passing 5/5 must transition address to /101/6.2/quiz-expert/');
  assertions += 3;

  // --------------------------------------------------------------------------
  // Test 2.3: Dedicated 20-Question Expert Quiz (/101/6.2/quiz-expert/index.html)
  // --------------------------------------------------------------------------
  const q62ExpertHtml = fs.readFileSync(path.join(webDir, '101/6.2/quiz-expert/index.html'), 'utf8');
  const script62Expert = q62ExpertHtml.split('<script>').pop().split('</script>')[0];

  // Case A: Visiting quiz-expert BEFORE passing 5-Q Learned -> Shows lock banner & hides form
  const envExpertLocked = createQuizSandbox(answersPass, 'kyle@lex.clinic');
  vm.runInContext(script62Expert, envExpertLocked.sandbox);
  assert.strictEqual(envExpertLocked.elementsById['expert-prerequisite-lock-banner'].style.display, 'block', 'Visiting quiz-expert before passing 5-Q Learned must display prerequisite lock banner');
  assert.strictEqual(envExpertLocked.elementsById['quiz-62-form'].style.display, 'none', 'Visiting quiz-expert before passing 5-Q Learned must hide the 20-question form');
  assertions += 2;

  // Case B: Visiting quiz-expert AFTER passing 5-Q Learned -> Hides lock banner & allows 20/20 submission
  const envExpert = createQuizSandbox(answersPass, 'kyle@lex.clinic', {
    lexclinic_quiz_submissions: savedSubsJson
  });
  vm.runInContext(script62Expert, envExpert.sandbox);
  assert.strictEqual(envExpert.elementsById['expert-prerequisite-lock-banner'].style.display, 'none', 'Visiting quiz-expert after passing 5-Q Learned must hide prerequisite lock banner');

  await envExpert.windowObj.submitQuiz({ preventDefault: () => {} });
  assert.strictEqual(envExpert.submittedPayloads.length, 1, 'Submitting 20-Q Expert Quiz must post to /api/submit-quiz');
  assert.strictEqual(envExpert.submittedPayloads[0].tier, 'expert', 'Expert Attestation tier must be expert');
  assert.strictEqual(envExpert.submittedPayloads[0].score, '20/20', 'Expert Attestation score must be 20/20');
  assert.ok(envExpert.submittedPayloads[0].payload_hash.startsWith('0x') && envExpert.submittedPayloads[0].payload_hash.length === 66, 'Expert Attestation must include 66-char 0x Keccak/SHA-256 hash');
  assertions += 5;

  // --------------------------------------------------------------------------
  // Test 2.4: Execute Interview Dual-Route Quiz (interview/lucas-kung/quiz-expert/index.html)
  // --------------------------------------------------------------------------
  const qLucasExpertHtml = fs.readFileSync(path.join(webDir, 'interview/lucas-kung/quiz-expert/index.html'), 'utf8');
  const scriptLucasExpert = qLucasExpertHtml.split('<script>').pop().split('</script>')[0];
  const envLucas = createQuizSandbox(answersPass, 'kyle@lex.clinic');
  vm.runInContext(scriptLucasExpert, envLucas.sandbox);

  await envLucas.windowObj.submitLucasQuiz({ preventDefault: () => {} });
  assert.strictEqual(envLucas.submittedPayloads.length, 1, 'Lucas Kung Expert quiz must post to /api/submit-quiz');
  assert.strictEqual(envLucas.submittedPayloads[0].class_id, 'interview_lucas_kung', 'Lucas Kung quiz class_id must be interview_lucas_kung');
  assert.strictEqual(envLucas.submittedPayloads[0].score, '20/20', 'Lucas Kung Expert quiz score must be 20/20');
  assertions += 3;

  console.log(` ✅ SUITE 02 PASSED: ${assertions} assertions verified (quiz-learned 5-Q, quiz-expert 20-Q, Smart Re-Entry Unlock, & Attestation Payloads)!`);
  return { passed: true, assertions };
}

module.exports = { run };
