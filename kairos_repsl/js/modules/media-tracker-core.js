/*
  LexClinic Education Platform — Media Tracker Core & W3C Screen Wake Lock
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
