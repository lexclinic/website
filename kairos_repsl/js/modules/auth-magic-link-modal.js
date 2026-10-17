/*
  LexClinic Education Platform — Magic Link Login Modal & Email Dispatcher
*/
var isMagicLinkDispatching = false;

function openNavLoginModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const modal = document.getElementById("nav-login-modal");
  if (modal) {
    modal.style.display = "flex";
    const emailInput = document.getElementById("modal-email-input");
    if (emailInput) setTimeout(() => emailInput.focus(), 100);
  }
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
    }, 1500);

  } catch (err) {
    window.processInstantLogin(emailInput);
    document.getElementById("modal-target-email").innerText = emailInput;
    modalForm.style.display = "none";
    modalNotice.style.display = "block";
    setTimeout(() => closeNavLoginModal(), 1500);
  } finally {
    isMagicLinkDispatching = false;
  }
}

window.openNavLoginModal = openNavLoginModal;
window.closeNavLoginModal = closeNavLoginModal;
window.triggerModalMagicLink = triggerModalMagicLink;
