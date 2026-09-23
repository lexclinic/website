/*
  LexClinic Education Platform — Player Adapter & YouTube API Orchestrator
  Build Version: 20260829_2360
*/

let ytPlayersMap = {};
let trackerMetersMap = {};
let isYouTubeApiReady = false;

// Dynamically load YouTube IFrame API
(function loadYouTubeIframeApi() {
  if (window.YT && window.YT.Player) {
    isYouTubeApiReady = true;
    return;
  }
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  } else {
    document.head.appendChild(tag);
  }
})();

// YouTube API ready callback
window.onYouTubeIframeAPIReady = function() {
  isYouTubeApiReady = true;
  if (window.initVideoWatchTracker) {
    window.initVideoWatchTracker();
  }
};

// Global Speed Controller for YouTube and HTML5 Media
window.setVideoSpeed = function(elementId, speed, btn) {
  try {
    if (ytPlayersMap[elementId]) {
      ytPlayersMap[elementId].setPlaybackRate(speed);
    } else {
      const el = document.getElementById(elementId) || document.querySelector(`#${elementId} video, #${elementId} audio`);
      if (el) el.playbackRate = speed;
    }

    if (btn && btn.parentNode) {
      const btns = btn.parentNode.querySelectorAll('.btn-speed');
      btns.forEach(b => {
        b.style.background = 'rgba(30, 41, 59, 0.8)';
        b.style.color = '#e2e8f0';
        b.style.borderColor = '#334155';
        b.style.fontWeight = '600';
      });
      btn.style.background = 'var(--accent-cyan)';
      btn.style.color = '#0a1128';
      btn.style.borderColor = 'var(--accent-cyan)';
      btn.style.fontWeight = '800';
    }
  } catch(e) {}
};

// Initialize MediaTrackerMeter instances and connect late-stage players
function initVideoWatchTracker() {
  try {
    const cards = document.querySelectorAll('.card, .pillar-card, .event-module-card, div[style*="background"]');
    if (!cards || cards.length === 0) return;

    cards.forEach((card, index) => {
      try {
        const hasMedia = card.querySelector('iframe, video, audio');
        const hasMeter = card.querySelector('.media-playback-meter-container');
        if (!hasMedia || !hasMeter) return;

        if (!card.id) {
          card.id = "card_media_" + index;
        }

        // 1. EARLY STAGE: Instantiate MediaTrackerMeter miniapp on card
        if (!trackerMetersMap[card.id]) {
          trackerMetersMap[card.id] = new MediaTrackerMeter(card);
        } else {
          trackerMetersMap[card.id].refreshUI();
        }

        const miniapp = trackerMetersMap[card.id];

        // 2. CONNECT HTML5 NATIVE AUDIO/VIDEO PLAYER
        const html5Media = card.querySelector('video, audio');
        if (html5Media) {
          miniapp.connectPlayer(html5Media);

          if (!html5Media.dataset.trackerBound) {
            html5Media.dataset.trackerBound = "true";
            html5Media.addEventListener('timeupdate', () => {
              if (html5Media.duration > 0) {
                const pct = Math.round((html5Media.currentTime / html5Media.duration) * 100);
                if (pct >= 1) {
                  miniapp.recordProgress(pct, html5Media.currentTime);
                }
              }
            });
            html5Media.addEventListener('ended', () => miniapp.recordProgress(100, html5Media.duration));
          }
        }

        // 3. LATE-STAGE: CONNECT YOUTUBE IFRAME PLAYER API
        const ytIframe = card.querySelector('iframe[src*="youtube.com"]');
        if (ytIframe) {
          if (!ytIframe.id) {
            ytIframe.id = "yt_frame_" + card.id;
          }

          if (isYouTubeApiReady && window.YT && window.YT.Player) {
            if (!ytPlayersMap[card.id]) {
              let pollInterval = null;

              const ytPlayer = new YT.Player(ytIframe.id, {
                events: {
                  'onReady': () => {
                    // Late-Stage Bridge: Connect player to miniapp upon ready
                    miniapp.connectPlayer(ytPlayer);
                  },
                  'onStateChange': (evt) => {
                    if (evt.data === YT.PlayerState.PLAYING) {
                      if (!pollInterval) {
                        pollInterval = setInterval(() => {
                          try {
                            const dur = ytPlayer.getDuration();
                            const cur = ytPlayer.getCurrentTime();
                            if (dur > 0) {
                              const pct = Math.round((cur / dur) * 100);
                              miniapp.recordProgress(pct, cur);
                            }
                          } catch(err) {}
                        }, 1000);
                      }
                    } else if (evt.data === YT.PlayerState.PAUSED || evt.data === YT.PlayerState.ENDED) {
                      if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                      }
                      if (evt.data === YT.PlayerState.ENDED) {
                        miniapp.recordProgress(100, ytPlayer.getDuration());
                      }
                    }
                  }
                }
              });

              ytPlayersMap[card.id] = ytPlayer;
            }
          }
        }

      } catch (innerErr) {}
    });
  } catch (err) {}
}

// Global Refresh Helper for Auth state changes
window.refreshAllTrackerMiniapps = function() {
  try {
    Object.values(trackerMetersMap).forEach(miniapp => {
      if (miniapp && miniapp.refreshUI) {
        miniapp.refreshUI();
      }
    });
  } catch(e) {}
};

// Sync all unsynced local watch history on login
function syncAllVideoWatchHistory(email) {
  if (!email) return;
  try {
    let history = {};
    try { history = JSON.parse(localStorage.getItem("lexclinic_video_watch_history") || "{}"); } catch(e) {}

    Object.values(history).forEach(item => {
      fetch("/api/track-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...item })
      }).catch(() => {});
    });

    window.refreshAllTrackerMiniapps();
  } catch (err) {}
}

// Global scope exposures
window.initVideoWatchTracker = initVideoWatchTracker;
window.syncAllVideoWatchHistory = syncAllVideoWatchHistory;
window.checkSeekTimeOnPageLoad = checkSeekTimeOnPageLoad;
window.trackerMetersMap = trackerMetersMap;
window.ytPlayersMap = ytPlayersMap;
