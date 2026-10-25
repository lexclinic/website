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
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        const isActive = navLinks.classList.toggle("active");
        if (toggleBtn.classList) toggleBtn.classList.toggle("active");
        toggleBtn.innerHTML = isActive ? "✕" : "☰";
      };
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
        <h2>⚖️ Welcome to LexClinic</h2>
        <span class="badge">Delaware Non-Profit — Pending 501(c)(3) Status</span>
        <p>Before proceeding, please review and acknowledge our Educational &amp; Legal Disclaimers:</p>
        <ul>
          <li><strong>Educational Public Good Scope:</strong> LexClinic Education, Inc. is a Delaware non-profit applying for 501(c)(3) tax-exempt recognition. All courseware, research, smart contracts (ERC-7827), and APIs are open public goods under AGPL-3.0 and CC-BY-SA 4.0.</li>
          <li><strong>No Legal Advice:</strong> Materials, interactive quizzes, and API queries are for academic and educational research and <strong>do not constitute formal legal advice, representation, or an attorney-client relationship</strong>.</li>
          <li><strong>Open-Source "AS IS" Warranty:</strong> All software code and specifications are provided "AS IS" without warranties of any kind.</li>
        </ul>
        <button type="button" id="btn-accept-disclaimer" onclick="window.acknowledgeDisclaimer()" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 1.05rem; padding: 0.75rem 1.75rem; width: 100%; border-radius: 8px; border: none; cursor: pointer; text-align: center;">
          I Understand &amp; Agree ➔
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function acknowledgeDisclaimer() {
    localStorage.setItem("lexclinic_disclaimer_ack", Date.now().toString());
    localStorage.setItem("lexclinic_disclaimer_acknowledged_time", Date.now().toString());
    localStorage.setItem("lexclinic_disclaimer_acknowledged", "true");
    const modal = document.getElementById("disclaimer-splash-modal");
    if (modal) {
      modal.style.opacity = "0";
      modal.style.transition = "opacity 0.3s ease";
      setTimeout(() => modal.remove(), 300);
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
  window.checkDisclaimerSplashModal = checkDisclaimerSplash;
  window.acknowledgeDisclaimer = acknowledgeDisclaimer;
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
