/*
  LexClinic Education Platform — Main Watch Tracker Orchestrator
  Build Version: 20261016_v3
*/
(function() {
  function loadScript(src) {
    const script = document.createElement('script');
    script.src = src + '?v=20261025_v17';
    script.async = false;
    document.head.appendChild(script);
  }

  loadScript('/js/modules/media-tracker-core.js');
  loadScript('/js/modules/youtube-adapter.js');
  loadScript('/js/modules/media-comments-approval.js');
  loadScript('/js/modules/semantic-anchors.js');
})();
