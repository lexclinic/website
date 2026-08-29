// Universal LexClinic Web Substrate Script: Auth, Modal, Version Sync, Mobile Nav, and Cross-Tab Login
const BUILD_VERSION = "20260829_1840";

function getSanitizedEmail() {
  const raw = localStorage.getItem("lexclinic_user_email");
  if (!raw || raw === "null" || raw === "undefined" || raw.trim() === "") return "";
  return raw.trim();
}

let loggedInEmail = getSanitizedEmail();
let isMagicLinkDispatching = false;
const authChannel = window.BroadcastChannel ? new BroadcastChannel("lexclinic_auth_channel") : null;

// Build Version Cookie & Cache Synchronization
checkBuildVersion();

// Attach global functions to window immediately
window.openNavLoginModal = openNavLoginModal;
window.closeNavLoginModal = closeNavLoginModal;
window.triggerModalMagicLink = triggerModalMagicLink;
window.resendMagicLinkModal = resendMagicLinkModal;
window.handleLogout = handleLogout;

// Universal Login Modal Injection (Execute immediately so it is available even before DOMContentLoaded)
injectUniversalLoginModal();

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Check Magic Link URL parameters on page load
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const emailParam = urlParams.get("email");

  if (token && emailParam) {
    loggedInEmail = decodeURIComponent(emailParam).trim();
    localStorage.setItem("lexclinic_user_email", loggedInEmail);
    localStorage.setItem("lexclinic_auth_timestamp", Date.now().toString());

    if (authChannel) {
      authChannel.postMessage({ type: "LOGIN_SUCCESS", email: loggedInEmail });
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2. Ensure modal is injected and handlers bound
  injectUniversalLoginModal();
  bindNavLoginButtons();
  bindMobileToggle();

  // 3. Initialize Auth UI
  updateAuthUI();

  // 4. Set up 1-second Polling for Instant Cross-Tab Login Sync
  setInterval(() => {
    const currentStoredEmail = getSanitizedEmail();
    if (currentStoredEmail !== loggedInEmail) {
      loggedInEmail = currentStoredEmail;
      updateAuthUI();
      if (loggedInEmail) closeNavLoginModal();
    }
  }, 1000);

  // Cross-Tab BroadcastChannel Listener
  if (authChannel) {
    authChannel.onmessage = (event) => {
      if (event.data && event.data.type === "LOGIN_SUCCESS") {
        loggedInEmail = event.data.email;
        updateAuthUI();
        closeNavLoginModal();
      }
    };
  }

  // Cross-Tab Storage Event Listener
  window.addEventListener("storage", (e) => {
    if (e.key === "lexclinic_user_email") {
      loggedInEmail = getSanitizedEmail();
      updateAuthUI();
      if (loggedInEmail) closeNavLoginModal();
    }
  });
});

function checkBuildVersion() {
  const lastBuild = localStorage.getItem("lexclinic_build");
  if (lastBuild && lastBuild !== BUILD_VERSION) {
    localStorage.setItem("lexclinic_build", BUILD_VERSION);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
      });
    }
    window.location.reload(true);
  } else {
    localStorage.setItem("lexclinic_build", BUILD_VERSION);
  }
}

// Mobile Hamburger Navigation Expansion
function bindMobileToggle() {
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  if (mobileToggle && navLinks) {
    const toggleMenu = (e) => {
      if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      navLinks.classList.toggle('active');
      return false;
    };

    mobileToggle.onclick = toggleMenu;
    mobileToggle.ontouchend = toggleMenu;
  }
}

// Universal Login Modal Injection
function injectUniversalLoginModal() {
  if (document.getElementById("login-modal-overlay")) return;

  const modalHtml = `
    <div id="login-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.88); z-index: 9999999; justify-content: center; align-items: center; padding: 1rem;">
      <div style="background: #0a1128; border: 2px solid #fbbf24; border-radius: 10px; max-width: 480px; width: 100%; padding: 2rem; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.9);">
        <button type="button" onclick="window.closeNavLoginModal()" ontouchend="window.closeNavLoginModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;">✕</button>
        <h2 style="color: #fbbf24; margin-top: 0; font-size: 1.4rem;">🔒 Login to Record Quiz Scores</h2>
        <p style="color: #e2e8f0; font-size: 0.95rem; margin-bottom: 1.25rem;">
          Anyone taking the assessment can log in with their email address to receive a secure <strong>magic link email from kyle@lex.clinic</strong> to record their quiz scores.
        </p>
        
        <form id="modal-login-form" onsubmit="event.preventDefault(); triggerModalMagicLink();">
          <label style="display: block; font-weight: 600; color: #ffffff; margin-bottom: 0.5rem; font-size: 0.9rem;">
            📧 Your Email Address:
          </label>
          <input type="email" id="modal-email-input" required placeholder="student@lex.clinic" style="width: 100%; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #1e293b; background: rgba(10, 17, 40, 0.9); color: #fff; margin-bottom: 1.25rem;">
          
          <button type="submit" id="modal-send-btn" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.75rem 1.25rem; background: #fbbf24; color: #0a1128; font-weight: 800; border: none; border-radius: 6px; cursor: pointer;">
            ✨ Send Magic Link to Email Inbox 📧
          </button>
        </form>

        <!-- Sent Notice inside Modal -->
        <div id="modal-sent-notice" style="display: none; margin-top: 1rem; background: rgba(52, 211, 153, 0.15); border: 1px solid #34d399; padding: 1.25rem; border-radius: 6px; color: #fff; font-size: 0.92rem;">
          <strong style="color: #34d399; font-size: 1.05rem;">✉️ Magic Link Sent to <span id="modal-target-email">...</span>!</strong>
          <p style="margin: 0.5rem 0 0.75rem 0; color: #e2e8f0; line-height: 1.5;">
            Please open your email inbox, check for an email from <strong>kyle@lex.clinic</strong>, and click the magic link to log in.
          </p>
          <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">
            Didn't receive it? <a href="javascript:void(0)" onclick="resendMagicLinkModal(event)" style="color: #38bdf8; text-decoration: underline;">Click here to send magic link again</a>.
          </p>
        </div>
      </div>
    </div>
  `;

  if (document.body) {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    });
  }
}

function bindNavLoginButtons() {
  const btns = document.querySelectorAll('#nav-login-btn, [onclick*="openNavLoginModal"], #logged-out-prompt-banner button');
  btns.forEach(btn => {
    const handleAuthTrigger = (e) => {
      if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      openNavLoginModal(e);
      return false;
    };

    btn.onclick = handleAuthTrigger;
    btn.ontouchend = handleAuthTrigger;
  });
}

function openNavLoginModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }

  loggedInEmail = getSanitizedEmail();

  injectUniversalLoginModal();

  const modalForm = document.getElementById("modal-login-form");
  const modalNotice = document.getElementById("modal-sent-notice");
  const modalBtn = document.getElementById("modal-send-btn");

  if (modalForm) modalForm.style.display = "block";
  if (modalBtn) {
    modalBtn.style.display = "block";
    modalBtn.innerText = "✨ Send Magic Link to Email Inbox 📧";
    modalBtn.disabled = false;
  }
  if (modalNotice) modalNotice.style.display = "none";

  const overlay = document.getElementById("login-modal-overlay");
  if (overlay) {
    overlay.style.setProperty("display", "flex", "important");
    overlay.style.setProperty("visibility", "visible", "important");
    overlay.style.setProperty("opacity", "1", "important");
  }
  
  const input = document.getElementById("modal-email-input");
  if (input) input.focus();

  return false;
}

function closeNavLoginModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const overlay = document.getElementById("login-modal-overlay");
  if (overlay) {
    overlay.style.setProperty("display", "none", "important");
  }
  return false;
}

function updateAuthUI() {
  loggedInEmail = getSanitizedEmail();

  const loggedInBar = document.getElementById("logged-in-bar");
  const userDisplay = document.getElementById("user-email-display");
  const quizForm = document.getElementById("quiz-form");
  const navBtns = document.querySelectorAll("#nav-login-btn");
  const promptBanner = document.getElementById("logged-out-prompt-banner");
  const badge = document.getElementById("auth-status-badge");

  if (loggedInEmail) {
    if (loggedInBar) loggedInBar.style.display = "flex";
    if (userDisplay) userDisplay.innerText = loggedInEmail;
    if (promptBanner) promptBanner.style.display = "none";
    if (quizForm) quizForm.style.display = "block";
    if (badge) {
      badge.innerText = `🔓 Logged In as ${loggedInEmail.substring(0, 12)}...`;
      badge.className = "status-badge media-available";
    }

    navBtns.forEach(navBtn => {
      navBtn.innerText = `🔓 ${loggedInEmail.split('@')[0]} (Logout)`;
      navBtn.style.background = "rgba(52, 211, 153, 0.2)";
      navBtn.style.color = "#34d399";
      navBtn.style.borderColor = "#34d399";
      navBtn.style.boxShadow = "none";
      navBtn.onclick = handleLogout;
      navBtn.ontouchend = handleLogout;
    });
  } else {
    if (loggedInBar) loggedInBar.style.display = "none";
    if (promptBanner) promptBanner.style.display = "block";
    if (quizForm) quizForm.style.display = "none";
    if (badge) {
      badge.innerText = "🔒 Magic Link Auth Required";
      badge.className = "status-badge notebook-available";
    }

    navBtns.forEach(navBtn => {
      navBtn.innerText = "🔒 Login";
      navBtn.style.background = "#fbbf24";
      navBtn.style.color = "#0a1128";
      navBtn.style.borderColor = "#f59e0b";
      navBtn.style.boxShadow = "0 0 10px rgba(251, 191, 36, 0.4)";
      navBtn.onclick = openNavLoginModal;
      navBtn.ontouchend = openNavLoginModal;
    });
  }
}

function handleLogout(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  localStorage.removeItem("lexclinic_user_email");
  loggedInEmail = "";
  updateAuthUI();
  const resBox = document.getElementById("quiz-results-box");
  if (resBox) resBox.style.display = "none";
  const confCard = document.getElementById("confirmation-notice-card");
  if (confCard) confCard.style.display = "none";
  return false;
}

async function triggerModalMagicLink() {
  if (isMagicLinkDispatching) return;

  const emailInput = document.getElementById("modal-email-input").value.trim();
  if (!emailInput) {
    alert("Please enter a valid email address.");
    return;
  }

  const modalBtn = document.getElementById("modal-send-btn");
  const modalForm = document.getElementById("modal-login-form");
  const modalNotice = document.getElementById("modal-sent-notice");

  modalBtn.innerText = "⏳ Dispatching Real Email...";
  modalBtn.disabled = true;
  isMagicLinkDispatching = true;

  try {
    const res = await fetch("/api/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput,
        redirectUrl: window.location.href.split("?")[0]
      })
    });

    const result = await res.json();
    document.getElementById("modal-target-email").innerText = emailInput;
    
    modalForm.style.display = "none";
    modalNotice.style.display = "block";
  } catch (err) {
    alert("Error sending magic link email: " + err.message);
    modalBtn.innerText = "✨ Send Magic Link to Email Inbox 📧";
    modalBtn.disabled = false;
  } finally {
    isMagicLinkDispatching = false;
  }
}

function resendMagicLinkModal(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const modalForm = document.getElementById("modal-login-form");
  const modalNotice = document.getElementById("modal-sent-notice");
  const modalBtn = document.getElementById("modal-send-btn");

  modalNotice.style.display = "none";
  modalForm.style.display = "block";
  modalBtn.style.display = "block";
  modalBtn.innerText = "✨ Send Magic Link to Email Inbox 📧";
  modalBtn.disabled = false;
  isMagicLinkDispatching = false;
  return false;
}
