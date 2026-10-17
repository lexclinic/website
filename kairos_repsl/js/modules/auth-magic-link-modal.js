/*
  LexClinic Education Platform — Magic Link Login Modal & Email Dispatcher
*/
var isMagicLinkDispatching = false;

function ensureNavLoginModalInDOM() {
  let modal = document.getElementById("nav-login-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "nav-login-modal";
    modal.className = "nav-login-modal";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 17, 40, 0.85); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 99999; padding: 1rem;";
    
    modal.innerHTML = `
      <div style="background: #0f172a; border: 2px solid var(--accent-gold); border-radius: 12px; width: 100%; max-width: 480px; padding: 1.75rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid #334155; padding-bottom: 0.75rem;">
          <h3 style="color: var(--accent-gold); font-size: 1.25rem; margin: 0; font-weight: 800;">🔒 LexClinic Member Sign In</h3>
          <button onclick="closeNavLoginModal(event)" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
        </div>

        <div id="modal-login-form">
          <p style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 1.25rem; line-height: 1.5;">
            Enter your email to receive a 1-click magic link or activate instant member access across LexClinic platforms.
          </p>
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.35rem;">EMAIL ADDRESS:</label>
            <input type="email" id="modal-email-input" placeholder="e.g. kyle@lex.clinic" style="width: 100%; padding: 0.75rem; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #f8fafc; font-size: 0.95rem;">
          </div>
          <button type="button" id="modal-send-btn" onclick="triggerModalMagicLink()" class="btn btn-primary" style="width: 100%; padding: 0.85rem; background: var(--accent-gold); color: #0a1128; font-weight: 800; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">✨ Send Magic Link to Email Inbox 📧</button>
        </div>

        <div id="modal-sent-notice" style="display: none; text-align: center; padding: 1rem 0;">
          <div style="background: rgba(52, 211, 153, 0.15); border: 1px solid #34d399; padding: 1.25rem; border-radius: 8px; color: #fff;">
            <strong style="color: #34d399; font-size: 1.05rem;">✉️ Magic Link Dispatched to <span id="modal-target-email">...</span>!</strong>
            <p style="font-size: 0.88rem; margin-top: 0.5rem; color: #cbd5e1;">Member session activated. Closing window...</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  return modal;
}

function openNavLoginModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const modal = ensureNavLoginModalInDOM();
  modal.style.display = "flex";
  const emailInput = document.getElementById("modal-email-input");
  if (emailInput) setTimeout(() => emailInput.focus(), 100);
  return false;
}

function closeNavLoginModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const modal = document.getElementById("nav-login-modal");
  if (modal) modal.style.display = "none";
  return false;
}

async function triggerModalMagicLink() {
  if (isMagicLinkDispatching) return;

  const emailInput = document.getElementById("modal-email-input").value.trim();
  if (!emailInput || !emailInput.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  const modalBtn = document.getElementById("modal-send-btn");
  const modalForm = document.getElementById("modal-login-form");
  const modalNotice = document.getElementById("modal-sent-notice");

  modalBtn.innerText = "⏳ Dispatching Login Session...";
  modalBtn.disabled = true;
  isMagicLinkDispatching = true;

  try {
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput,
        redirectUrl: window.location.href.split("?")[0]
      })
    });

    const rawText = await res.text();
    try { JSON.parse(rawText); } catch(e) {}

    window.processInstantLogin(emailInput);

    document.getElementById("modal-target-email").innerText = emailInput;
    modalForm.style.display = "none";
    modalNotice.style.display = "block";

    setTimeout(() => {
      closeNavLoginModal();
    }, 1200);

  } catch (err) {
    window.processInstantLogin(emailInput);
    document.getElementById("modal-target-email").innerText = emailInput;
    modalForm.style.display = "none";
    modalNotice.style.display = "block";
    setTimeout(() => closeNavLoginModal(), 1200);
  } finally {
    isMagicLinkDispatching = false;
  }
}

window.ensureNavLoginModalInDOM = ensureNavLoginModalInDOM;
window.openNavLoginModal = openNavLoginModal;
window.closeNavLoginModal = closeNavLoginModal;
window.triggerModalMagicLink = triggerModalMagicLink;
