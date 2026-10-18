/*
  LexClinic Platform UI Interactive Controls Subsystem
  Restores: Mobile Hamburger Toggle, 24-Hour Disclaimer Splash Modal, Fullscreen Expansion
*/

(function() {

  // 1. MOBILE HAMBURGER TOGGLE BINDER
  function bindMobileToggle() {
    const toggleBtn = document.getElementById("mobile-toggle") || document.querySelector(".mobile-toggle");
    const navLinks = document.getElementById("nav-links") || document.querySelector(".nav-links");

    if (toggleBtn && navLinks) {
      toggleBtn.onclick = function(e) {
        e.preventDefault();
        navLinks.classList.toggle("active");
        toggleBtn.classList.toggle("active");
      };
      toggleBtn.ontouchend = toggleBtn.onclick;
    }
  }

  // 2. 24-HOUR DISCLAIMER SPLASH MODAL
  function checkDisclaimerSplash() {
    const LAST_ACK_KEY = "lexclinic_disclaimer_ack";
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const lastAck = parseInt(localStorage.getItem(LAST_ACK_KEY) || "0", 10);
    const now = Date.now();

    if (now - lastAck < TWENTY_FOUR_HOURS_MS) {
      return; // Already acknowledged within 24 hours
    }

    if (document.getElementById("disclaimer-splash-modal")) return;

    const overlay = document.createElement("div");
    overlay.id = "disclaimer-splash-modal";
    overlay.className = "disclaimer-splash-overlay";
    overlay.innerHTML = `
      <div class="disclaimer-splash-card">
        <h2>⚖️ Legal Research Disclaimer</h2>
        <span class="badge">Delaware Non-Profit / Form 1023 Candidate</span>
        <p>LexClinic Education, Inc. publishes open-source software, legal engineering courseware, and APIs strictly for educational research purposes.</p>
        <ul>
          <li><strong>No Legal Advice:</strong> Content on lex.clinic does not constitute formal legal counsel or create an attorney-client relationship.</li>
          <li><strong>Open Public Goods:</strong> All runtimes are distributed under AGPL-3.0 and Creative Commons Attribution-ShareAlike 4.0.</li>
          <li><strong>Non-Commercial Educational Scope:</strong> Compliant with IRC § 513 UBIT educational activities.</li>
        </ul>
        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="btn-accept-disclaimer" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; padding: 0.65rem 1.5rem; border-radius: 8px; border: none; cursor: pointer; font-size: 0.95rem;">
            I Acknowledge &amp; Accept Terms ➔
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const acceptBtn = document.getElementById("btn-accept-disclaimer");
    if (acceptBtn) {
      acceptBtn.onclick = function() {
        localStorage.setItem(LAST_ACK_KEY, Date.now().toString());
        overlay.remove();
      };
    }
  }

  // 3. FULLSCREEN MEDIA EXPANSION
  function toggleFullscreenIframe(cardId) {
    const cardEl = document.getElementById(cardId) || document.querySelector(`.media-card[data-card-id="${cardId}"]`);
    if (!cardEl) return;

    const mediaTarget = cardEl.querySelector("iframe") || cardEl.querySelector(".video-container") || cardEl;
    if (!mediaTarget) return;

    if (!document.fullscreenElement) {
      if (mediaTarget.requestFullscreen) {
        mediaTarget.requestFullscreen();
      } else if (mediaTarget.webkitRequestFullscreen) {
        mediaTarget.webkitRequestFullscreen();
      } else if (mediaTarget.msRequestFullscreen) {
        mediaTarget.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Export Window Functions
  window.bindMobileToggle = bindMobileToggle;
  window.checkDisclaimerSplash = checkDisclaimerSplash;
  window.toggleFullscreenIframe = toggleFullscreenIframe;

  // Auto-run on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindMobileToggle();
      checkDisclaimerSplash();
    });
  } else {
    bindMobileToggle();
    checkDisclaimerSplash();
  }

})();
