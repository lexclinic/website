/*
  LexClinic Education Platform — Main Auth Orchestrator
  Build Version: 20261016_v4
*/
(function() {
  function loadScript(src) {
    const script = document.createElement('script');
    script.src = src + '?v=20261025_v20';
    script.async = false;
    document.head.appendChild(script);
  }

  loadScript('/js/modules/auth-core.js');
  loadScript('/js/modules/auth-magic-link-modal.js');
})();
