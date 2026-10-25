const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

function createQuizSandbox(selectedAnswers = {}, userEmail = 'kyle@lex.clinic') {
  const store = { lexclinic_user_email: userEmail };
  const elementsById = {};
  const submittedPayloads = [];

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
        if (sel.includes('quiz-question-card')) {
          return { style: { borderColor: '' } };
        }
        return null;
      }
    };
    elementsById[id] = el;
    return el;
  }

  // Common quiz DOM IDs across all 19 quiz templates
  const commonIds = [
    'quiz-form', 'quiz-results', 'score-text',
    'quiz-61-form', 'quiz-62-form', 'quiz-42-form', 'quiz-51-form', 'quiz-52-form',
    'lucas-quiz-form', 'sept24-quiz-form',
    'mastery-questions-container', 'quiz-stage-heading', 'quiz-stage-subtext',
    'submit-quiz-btn', 'quiz-submit-btn', 'unlock-20q-offer-box',
    'quiz-result-card', 'quiz-result-title', 'quiz-score-summary', 'quiz-hash-box', 'quiz-payload-hash',
    'quiz-results-box', 'quiz-score-text', 'quiz-hash-display', 'quiz-result', 'quiz-hash-val'
  ];
  commonIds.forEach(id => makeEl(id));

  // Proxy form elements so form['q1'].value works for 101/1.1-4.1 and event quizzes
  ['quiz-form', 'quiz-61-form', 'quiz-62-form'].forEach(fid => {
    for (let i = 1; i <= 20; i++) {
      elementsById[fid]['q' + i] = {
        get value() { return selectedAnswers['q' + i] || ''; }
      };
    }
  });

  const localStorageMock = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const windowObj = {
    localStorage: localStorageMock,
    getSanitizedEmail: () => userEmail,
    scrollTo: () => {},
    crypto: crypto.webcrypto
  };

  const documentObj = {
    getElementById: (id) => elementsById[id] || makeEl(id),
    querySelector: (sel) => ({ scrollIntoView: () => {}, style: {} })
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
    console: { log: () => {}, error: () => {} },
    fetch: async (url, opts = {}) => {
      if (url === '/api/submit-quiz' && opts.body) {
        submittedPayloads.push(JSON.parse(opts.body));
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    }
  };

  vm.createContext(sandbox);
  return { sandbox, windowObj, elementsById, localStorageMock, submittedPayloads };
}

async function run(webDir) {
  console.log(" 🧪 Executing Suite 02: Two-Tier Quiz Engine & Keccak-256 Attestation Tests...");
  let assertions = 0;

  // --------------------------------------------------------------------------
  // Test 2.1: Progressive Two-Tier (5-Q Core -> 20-Q Mastery) Flow on 101/6.1
  // --------------------------------------------------------------------------
  const q61Html = fs.readFileSync(path.join(webDir, '101/6.1/quiz.html'), 'utf8');
  const q61ScriptMatch = q61Html.match(/<script>([\s\S]*?)<\/script>\s*<!-- Footer -->/) || q61Html.match(/<script>([\s\S]*?)<\/script>/g);
  const inlineScript61 = q61Html.split('<script>').pop().split('</script>')[0];

  // Case A: Failing Core Check (2/5 correct) -> Should NOT unlock Mastery or emit hash
  const answersFail = { q1: 'A', q2: 'A', q3: 'B', q4: 'C', q5: 'B' };
  const envFail = createQuizSandbox(answersFail, 'kyle@lex.clinic');
  vm.runInContext(inlineScript61, envFail.sandbox);
  await envFail.windowObj.submitQuiz61({ preventDefault: () => {} });

  assert.strictEqual(envFail.submittedPayloads.length, 0, 'Failing Core Check (2/5) must not submit attestation to /api/submit-quiz');
  assert.strictEqual(envFail.elementsById['unlock-20q-offer-box'].style.display, 'none', 'Failing Core Check must not display 20-Q Mastery unlock offer');
  assert.ok(envFail.elementsById['quiz-result-title'].innerText.includes('Pass Threshold Not Met'), 'Failing Core Check should show threshold warning');
  assertions += 3;

  // Case B: Passing Core Check (5/5 correct) -> Emits Core Attestation + Unlocks 20-Q Mastery
  const answersPass = {};
  for (let i = 1; i <= 20; i++) answersPass['q' + i] = 'A';
  const envPass = createQuizSandbox(answersPass, 'kyle@lex.clinic');
  vm.runInContext(inlineScript61, envPass.sandbox);

  await envPass.windowObj.submitQuiz61({ preventDefault: () => {} });
  assert.strictEqual(envPass.submittedPayloads.length, 1, 'Passing 5-Q Core Check must submit Core Attestation to /api/submit-quiz');
  assert.strictEqual(envPass.submittedPayloads[0].class_id, '6.1', 'Core Attestation class_id must be 6.1');
  assert.strictEqual(envPass.submittedPayloads[0].score, '5/5', 'Core Attestation score must be 5/5');
  assert.ok(envPass.submittedPayloads[0].payload_hash.startsWith('0x') && envPass.submittedPayloads[0].payload_hash.length === 66, 'Core Attestation must generate 32-byte hex payload_hash');
  assert.strictEqual(envPass.elementsById['unlock-20q-offer-box'].style.display, 'block', 'Passing 5-Q Core Check must display 20-Q Mastery unlock offer');
  assertions += 5;

  // Case C: Unlocking Stage 2 (20-Question Mastery) & Submitting 20/20 Mastery Attestation
  envPass.windowObj.unlockMasteryQuiz61();
  assert.strictEqual(envPass.elementsById['mastery-questions-container'].style.display, 'block', 'unlockMasteryQuiz61 must reveal Q6-Q20 container');
  assert.strictEqual(envPass.elementsById['unlock-20q-offer-box'].style.display, 'none', 'unlockMasteryQuiz61 must hide offer banner');

  await envPass.windowObj.submitQuiz61({ preventDefault: () => {} });
  assert.strictEqual(envPass.submittedPayloads.length, 2, 'Submitting Stage 2 must post upgraded 20-Q Mastery Attestation');
  assert.strictEqual(envPass.submittedPayloads[1].score, '20/20', 'Mastery Attestation score must be 20/20');
  assert.strictEqual(envPass.submittedPayloads[1].total, 20, 'Mastery Attestation total must be 20');

  const localSubs61 = JSON.parse(envPass.localStorageMock.getItem('lexclinic_quiz_submissions') || '[]');
  assert.strictEqual(localSubs61.length, 1, 'Upgraded Mastery Attestation should replace prior Core entry for same class_id in localStorage');
  assert.strictEqual(localSubs61[0].score, '20/20', 'localStorage entry should reflect upgraded 20/20 Mastery score');
  assertions += 7;

  // --------------------------------------------------------------------------
  // Test 2.2: Execute Early 101 Quiz (101/3.1/quiz.html) & Verify Normalized Contract
  // --------------------------------------------------------------------------
  const q31Html = fs.readFileSync(path.join(webDir, '101/3.1/quiz.html'), 'utf8');
  const inlineScript31 = q31Html.split('<script>').pop().split('</script>')[0];
  const answers31 = {};
  for (let i = 1; i <= 20; i++) answers31['q' + i] = 'a';
  const env31 = createQuizSandbox(answers31, 'kyle@lex.clinic');
  vm.runInContext(inlineScript31, env31.sandbox);

  await env31.windowObj.submitQuiz();
  assert.strictEqual(env31.submittedPayloads.length, 1, '101/3.1 submitQuiz must post to /api/submit-quiz');
  assert.strictEqual(env31.submittedPayloads[0].class_id, '3.1', '101/3.1 class_id must be 3.1');
  assert.strictEqual(env31.submittedPayloads[0].score, 20, '101/3.1 score must be 20');
  assert.ok(env31.submittedPayloads[0].payload_hash.startsWith('0x') && env31.submittedPayloads[0].payload_hash.length === 66, '101/3.1 must include 66-char 0x SHA-256/Keccak payload_hash');
  assertions += 4;

  // --------------------------------------------------------------------------
  // Test 2.3: Execute Interview Quiz (interview/lucas-kung/quiz.html)
  // --------------------------------------------------------------------------
  const qLucasHtml = fs.readFileSync(path.join(webDir, 'interview/lucas-kung/quiz.html'), 'utf8');
  const inlineScriptLucas = qLucasHtml.split('<script>').pop().split('</script>')[0];
  const envLucas = createQuizSandbox(answersPass, 'kyle@lex.clinic');
  vm.runInContext(inlineScriptLucas + '; window.submitLucasQuiz = submitLucasQuiz;', envLucas.sandbox);

  await envLucas.windowObj.submitLucasQuiz({ preventDefault: () => {} });
  assert.strictEqual(envLucas.submittedPayloads.length, 1, 'Lucas Kung interview quiz must post to /api/submit-quiz');
  assert.strictEqual(envLucas.submittedPayloads[0].class_id, 'interview_lucas_kung', 'Lucas Kung quiz class_id must be interview_lucas_kung');
  assert.strictEqual(envLucas.submittedPayloads[0].score, 20, 'Lucas Kung quiz score must be 20');
  assertions += 3;

  console.log(` ✅ SUITE 02 PASSED: ${assertions} assertions verified (5->20 Progressive Quiz Engine, Pass Gating, & Attestation Payloads)!`);
  return { passed: true, assertions };
}

module.exports = { run };
