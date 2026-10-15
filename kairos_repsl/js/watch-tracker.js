/*
  LexClinic Education Platform — Player Adapter, YouTube API Orchestrator & Screen Wake Lock
  Build Version: 20261014_2800
*/

// ============================================================================
// GLOBAL SCREEN WAKE LOCK MANAGER
// ============================================================================
class ScreenWakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.isMediaActive = false;
    this.initListeners();
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (err) {}
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try { await this.wakeLock.release(); } catch (err) {}
      this.wakeLock = null;
    }
  }

  initListeners() {
    const onFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (isFullscreen) {
        this.requestWakeLock();
      } else if (!this.isMediaActive) {
        this.releaseWakeLock();
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    document.addEventListener('play', () => {
      this.isMediaActive = true;
      this.requestWakeLock();
    }, true);

    document.addEventListener('pause', () => { this.checkMediaStateAndRelease(); }, true);
    document.addEventListener('ended', () => { this.checkMediaStateAndRelease(); }, true);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && (this.isMediaActive || document.fullscreenElement)) {
        this.requestWakeLock();
      }
    });
  }

  checkMediaStateAndRelease() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const playingMedia = Array.from(document.querySelectorAll('audio, video')).some(el => !el.paused && !el.ended);
    this.isMediaActive = playingMedia;
    if (!this.isMediaActive && !isFullscreen) {
      this.releaseWakeLock();
    }
  }
}

window.screenWakeLockManager = new ScreenWakeLockManager();

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

// Global Speed Controller for YouTube and HTML5 Media (Auto-Binding Bridge)
window.setVideoSpeed = function(elementId, speed, btn) {
  try {
    let player = ytPlayersMap[elementId];
    
    if (!player) {
      const card = document.getElementById(elementId) || (btn ? btn.closest('.card, .pillar-card, .event-module-card') : null);
      if (card) {
        player = ytPlayersMap[card.id];
        if (!player && window.YT && window.YT.Player) {
          const ytIframe = card.querySelector('iframe[src*="youtube.com"]');
          if (ytIframe) {
            if (!ytIframe.id) ytIframe.id = "yt_frame_" + (card.id || "media");
            player = new YT.Player(ytIframe.id, {
              events: {
                'onReady': (evt) => {
                  try { evt.target.setPlaybackRate(speed); } catch(e) {}
                }
              }
            });
            ytPlayersMap[card.id] = player;
          }
        }
      }
    }

    if (player && player.setPlaybackRate) {
      player.setPlaybackRate(speed);
    } else {
      const el = document.getElementById(elementId) || (btn ? btn.closest('.card, .pillar-card, .event-module-card').querySelector('video, audio') : null);
      if (el && el.playbackRate) el.playbackRate = speed;
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

        // 1. Instantiate MediaTrackerMeter miniapp on card
        if (!trackerMetersMap[card.id]) {
          trackerMetersMap[card.id] = new MediaTrackerMeter(card);
        } else {
          trackerMetersMap[card.id].refreshUI();
        }

        const miniapp = trackerMetersMap[card.id];

        // 2. Connect HTML5 Audio/Video
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

        // 3. Connect YouTube IFrame Player API
        const ytIframe = card.querySelector('iframe[src*="youtube.com"]');
        if (ytIframe) {
          if (!ytIframe.id) {
            ytIframe.id = "yt_frame_" + card.id;
          }

          if ((window.YT && window.YT.Player) || isYouTubeApiReady) {
            if (!ytPlayersMap[card.id]) {
              let pollInterval = null;

              try {
                const ytPlayer = new YT.Player(ytIframe.id, {
                  events: {
                    'onReady': () => {
                      miniapp.connectPlayer(ytPlayer);
                    },
                    'onStateChange': (evt) => {
                      if (evt.data === YT.PlayerState.PLAYING) {
                        if (window.screenWakeLockManager) {
                          window.screenWakeLockManager.isMediaActive = true;
                          window.screenWakeLockManager.requestWakeLock();
                        }
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
                        if (window.screenWakeLockManager) {
                          window.screenWakeLockManager.checkMediaStateAndRelease();
                        }
                      }
                    }
                  }
                });

                ytPlayersMap[card.id] = ytPlayer;
              } catch(ytErr) {}
            }
          }
        }

      } catch (innerErr) {}
    });
  } catch (err) {}
}

// Global scope exposures
window.initVideoWatchTracker = initVideoWatchTracker;
window.trackerMetersMap = trackerMetersMap;
window.ytPlayersMap = ytPlayersMap;

// Auto-run initialization on DOM readiness and load events
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVideoWatchTracker);
} else {
  initVideoWatchTracker();
}
window.addEventListener('load', () => {
  initVideoWatchTracker();
  setTimeout(initVideoWatchTracker, 1500);
});
