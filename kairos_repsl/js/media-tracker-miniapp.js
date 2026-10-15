/*
  LexClinic Education Platform — Standalone MediaTrackerMeter Component
  Build Version: 20260829_2380
*/

class MediaTrackerMeter {
  constructor(cardElement) {
    this.card = cardElement;
    this.id = cardElement.id || ("card_media_" + Math.floor(Math.random() * 10000));
    if (!this.card.id) this.card.id = this.id;

    // Attach reference directly on card DOM node
    this.card.trackerMiniapp = this;

    // Locate static meter container
    this.meter = this.card.querySelector('.media-playback-meter-container');
    if (!this.meter) return;

    const heading = this.card.querySelector('h3, h4, h2');
    this.title = heading ? heading.innerText.replace(/^[0-9]+\.\s*/, '').trim() : "Media Clip";

    const hasAudioTag = !!this.card.querySelector('audio') || this.id.includes('audio') || this.title.toLowerCase().includes('audio');
    this.mediaType = hasAudioTag ? 'audio' : 'video';
    this.mediaIcon = hasAudioTag ? '🎧' : '🎥';
    this.mediaLabel = hasAudioTag ? 'Audio Track' : 'Video Clip';

    this.connectedPlayer = null;
    this.pendingSeekTime = null;

    this.initResumeOnlyClick();
    this.refreshUI();
  }

  // Key Migration Helper: Find history by static ID or legacy title match
  getSavedRecord() {
    try {
      const history = JSON.parse(localStorage.getItem("lexclinic_video_watch_history") || "{}");
      if (history[this.id]) {
        return history[this.id];
      }

      // Check legacy hash keys matching this card's title
      const records = Object.values(history);
      for (let rec of records) {
        if (rec.video_title && this.title && rec.video_title.toLowerCase() === this.title.toLowerCase()) {
          return rec;
        }
      }
      return { progress: 0, current_time: 0 };
    } catch (e) {
      return { progress: 0, current_time: 0 };
    }
  }

  refreshUI() {
    if (!this.meter) return;
    const record = this.getSavedRecord();
    const prog = record.progress || 0;
    const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
    const isLogged = !!userEmail;

    const statusText = this.meter.querySelector('.meter-status-text');
    const authHint = this.meter.querySelector('.meter-auth-hint');
    const fillBar = this.meter.querySelector('.meter-fill-bar');

    const cleanProg = Math.min(100, Math.max(0, prog));

    if (fillBar) {
      fillBar.style.width = `${cleanProg}%`;
      fillBar.style.background = cleanProg >= 90 ? '#34d399' : 'linear-gradient(90deg, #38bdf8, #34d399)';
    }

    if (cleanProg >= 90) {
      if (statusText) statusText.innerHTML = `✅ <strong>100% Watched (${this.mediaLabel})</strong>`;
      if (authHint) authHint.innerHTML = isLogged ? `<a href="/profile/" style="color: #34d399; font-weight: 700; text-decoration: underline; font-size: 0.8rem;">👤 ${userEmail.split('@')[0]} (Saved ➔)</a>` : `<a href="javascript:void(0)" onclick="openNavLoginModal(event)" style="color: #fbbf24; font-weight: 800; text-decoration: underline; font-size: 0.8rem;">🔒 Log In to Save</a>`;
    } else if (cleanProg > 0) {
      if (statusText) statusText.innerHTML = `▶️ <strong>${cleanProg}% Watched (${this.mediaLabel})</strong>`;
      if (authHint) authHint.innerHTML = isLogged ? `<a href="/profile/" style="color: #38bdf8; text-decoration: underline; font-size: 0.8rem;">👤 ${userEmail.split('@')[0]} (Profile ➔)</a>` : `<a href="javascript:void(0)" onclick="openNavLoginModal(event)" style="color: #fbbf24; font-weight: 800; text-decoration: underline; font-size: 0.8rem;">🔒 Log In to Save</a>`;
    } else {
      if (statusText) statusText.innerHTML = `${this.mediaIcon} <strong>Unwatched ${this.mediaLabel}</strong>`;
      if (authHint) authHint.innerHTML = isLogged ? `<span style="color: #34d399; font-size: 0.8rem; font-weight: 600;">👤 Linked as ${userEmail.split('@')[0]}</span>` : `<a href="javascript:void(0)" onclick="openNavLoginModal(event)" style="color: #fbbf24; font-weight: 700; text-decoration: underline; font-size: 0.8rem;">🔒 Log In to Save Watch Tracker</a>`;
    }
  }

  recordProgress(prog, currentTime = 0) {
    try {
      let history = {};
      try { history = JSON.parse(localStorage.getItem("lexclinic_video_watch_history") || "{}"); } catch(e) {}
      const existing = history[this.id] || {};
      const newProg = Math.max(existing.progress || 0, prog);

      const record = {
        video_id: this.id,
        video_title: this.title,
        media_type: this.mediaType,
        page_url: window.location.pathname,
        progress: newProg,
        current_time: Math.round(currentTime),
        timestamp: new Date().toISOString()
      };

      history[this.id] = record;
      localStorage.setItem("lexclinic_video_watch_history", JSON.stringify(history));
      this.refreshUI();

      const email = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
      if (email) {
        fetch("/api/track-watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ...record })
        }).catch(() => {});
      }
    } catch(e) {}
  }

  // Late-Stage Player Connection Bridge
  connectPlayer(player) {
    this.connectedPlayer = player;
    
    // Execute pending seek if user clicked progress bar before player finished loading
    if (this.pendingSeekTime !== null) {
      this.seekPlayerToTime(this.pendingSeekTime);
      this.pendingSeekTime = null;
    }
  }

  seekPlayerToTime(targetSeconds) {
    try {
      if (!this.connectedPlayer) return;

      // 1. YouTube Player Instance (`YT.Player`)
      if (typeof this.connectedPlayer.seekTo === 'function') {
        let playerState = -1;
        try { playerState = this.connectedPlayer.getPlayerState(); } catch(e) {}

        if (typeof this.connectedPlayer.playVideo === 'function') {
          this.connectedPlayer.playVideo();
        }

        if (targetSeconds > 0) {
          setTimeout(() => {
            try { this.connectedPlayer.seekTo(targetSeconds, true); } catch(e) {}
          }, 300);
        }
      } 
      // 2. HTML5 Native <video> or <audio> Element
      else if (typeof this.connectedPlayer.currentTime !== 'undefined') {
        const mediaEl = this.connectedPlayer;

        if (mediaEl.readyState < 1) {
          mediaEl.addEventListener('loadedmetadata', () => {
            if (targetSeconds > 0) mediaEl.currentTime = targetSeconds;
            try { mediaEl.play().catch(() => {}); } catch(e) {}
          }, { once: true });
          mediaEl.load();
        } else {
          if (targetSeconds > 0) mediaEl.currentTime = targetSeconds;
          try { mediaEl.play().catch(() => {}); } catch(e) {}
        }
      }
    } catch(err) {}
  }

  // Resume & Start Playback on Meter Bar Click (Never advance bar without media playback)
  initResumeOnlyClick() {
    if (!this.meter || this.meter.dataset.resumeClickBound) return;
    this.meter.dataset.resumeClickBound = "true";
    this.meter.style.cursor = "pointer";
    this.meter.title = "Click meter bar to start or resume playback";

    this.meter.addEventListener("click", () => {
      const record = this.getSavedRecord();
      const savedTime = record.current_time || 0;

      if (this.connectedPlayer) {
        this.seekPlayerToTime(savedTime);
      } else {
        this.pendingSeekTime = savedTime;
        // Attempt starting HTML5 media or iframe play
        const mediaEl = this.card.querySelector('video, audio');
        if (mediaEl) {
          try { mediaEl.play().catch(() => {}); } catch(e) {}
        }
      }
    });
  }
}

// Global scope exposures
window.MediaTrackerMeter = MediaTrackerMeter;
