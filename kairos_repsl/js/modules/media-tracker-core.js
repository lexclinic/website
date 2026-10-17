/*
  LexClinic Education Platform — Media Tracker Core, Audio Timeupdate & W3C Screen Wake Lock
*/
class ScreenWakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.initListeners();
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
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
    document.addEventListener('visibilitychange', async () => {
      if (this.wakeLock !== null && document.visibilityState === 'visible') {
        await this.requestWakeLock();
      }
    });
  }
}

window.screenWakeLockManager = new ScreenWakeLockManager();

// Native Audio/Video Timeupdate Progress Listener
function initNativeMediaListeners() {
  const cards = document.querySelectorAll('.card, .pillar-card');
  cards.forEach(card => {
    const miniapp = card.trackerMiniapp;
    const mediaEl = card.querySelector('audio, video');
    
    if (mediaEl && miniapp && !mediaEl.dataset.trackerBound) {
      mediaEl.dataset.trackerBound = "true";
      miniapp.connectPlayer(mediaEl);
      
      mediaEl.addEventListener('timeupdate', () => {
        if (mediaEl.duration > 0) {
          const pct = Math.round((mediaEl.currentTime / mediaEl.duration) * 100);
          miniapp.recordProgress(pct, mediaEl.currentTime);
        }
      });
      
      mediaEl.addEventListener('ended', () => {
        miniapp.recordProgress(100, mediaEl.duration);
      });
    }
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initNativeMediaListeners();
} else {
  document.addEventListener('DOMContentLoaded', initNativeMediaListeners);
}
