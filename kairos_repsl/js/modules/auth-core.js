/*
  LexClinic Education Platform — Auth Core & Navbar UI Manager
*/
var loggedInEmail = "";

function getSanitizedEmail() {
  const email = localStorage.getItem("lexclinic_user_email") || loggedInEmail || "";
  return email.toLowerCase().trim();
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
    document.body.classList.add('auth-logged-in');
    if (loggedInBar) loggedInBar.style.display = "flex";
    if (userDisplay) userDisplay.innerText = loggedInEmail;
    if (promptBanner) promptBanner.style.display = "none";
    if (quizForm) quizForm.style.display = "block";
    if (badge) {
      badge.innerText = `🔓 Logged In as ${loggedInEmail.substring(0, 12)}...`;
      badge.className = "status-badge media-available";
    }

    navBtns.forEach(navBtn => {
      navBtn.innerText = `👤 ${loggedInEmail.split('@')[0]}`;
      navBtn.title = `Logged in as ${loggedInEmail} — Click to View Member Profile`;
      navBtn.style.background = "rgba(52, 211, 153, 0.2)";
      navBtn.style.color = "#34d399";
      navBtn.style.borderColor = "#34d399";
      navBtn.style.boxShadow = "none";
      navBtn.onclick = function(e) {
        if (e) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
        }
        window.location.href = "/profile/";
        return false;
      };
      navBtn.ontouchend = navBtn.onclick;
    });

    if (window.syncAllVideoWatchHistory) {
      window.syncAllVideoWatchHistory(loggedInEmail);
    }
  } else {
    document.body.classList.remove('auth-logged-in');
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
      navBtn.onclick = function(e) {
        if (window.openNavLoginModal) {
          return window.openNavLoginModal(e);
        }
      };
      navBtn.ontouchend = navBtn.onclick;
    });
  }

  if (window.updateAuthButtonVisibility) window.updateAuthButtonVisibility();
  if (window.initAllMediaMeters) window.initAllMediaMeters();
}

function processInstantLogin(email) {
  if (!email || !email.includes("@")) return false;
  localStorage.setItem("lexclinic_user_email", email.toLowerCase().trim());
  loggedInEmail = email.toLowerCase().trim();
  updateAuthUI();
  return true;
}

window.getSanitizedEmail = getSanitizedEmail;
window.updateAuthUI = updateAuthUI;
window.processInstantLogin = processInstantLogin;

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
});
