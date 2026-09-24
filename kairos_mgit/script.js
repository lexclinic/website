/*
  LexClinic Education Substrate Platform JavaScript Master Orchestrator
  Build Version: 20260829_2245
*/

// Initialize all modular subsystems when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (window.bindMobileToggle) window.bindMobileToggle();
  if (window.bindNavLoginButtons) window.bindNavLoginButtons();
  if (window.checkMagicLinkTokenInUrl) window.checkMagicLinkTokenInUrl();
  if (window.updateAuthUI) window.updateAuthUI();
  if (window.initVideoWatchTracker) window.initVideoWatchTracker();
  if (window.checkSeekTimeOnPageLoad) window.checkSeekTimeOnPageLoad();
});
