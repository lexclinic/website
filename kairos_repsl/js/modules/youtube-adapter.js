/*
  LexClinic Education Platform — YouTube API Orchestrator & Speed Controller
*/
window.ytPlayersMap = window.ytPlayersMap || {};

function onYouTubeIframeAPIReady() {
  const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
  iframes.forEach(iframe => {
    const card = iframe.closest('.card, .pillar-card');
    const cardId = card ? card.id : iframe.id;
    if (!iframe.id) iframe.id = "yt_frame_" + cardId;

    try {
      const player = new YT.Player(iframe.id, {
        events: {
          'onReady': (evt) => {
            window.ytPlayersMap[cardId] = evt.target;
            window.ytPlayersMap[iframe.id] = evt.target;
            if (card && card.trackerMiniapp) {
              card.trackerMiniapp.connectPlayer(evt.target);
            }
          },
          'onStateChange': (evt) => {
            if (evt.data === YT.PlayerState.PLAYING) {
              if (window.screenWakeLockManager) window.screenWakeLockManager.requestWakeLock();
            } else if (evt.data === YT.PlayerState.PAUSED || evt.data === YT.PlayerState.ENDED) {
              if (window.screenWakeLockManager) window.screenWakeLockManager.releaseWakeLock();
            }
          }
        }
      });
    } catch(err) {}
  });
}

function setVideoSpeed(cardId, speedRate, btnElement) {
  try {
    const card = document.getElementById(cardId) || (btnElement && btnElement.closest('[id]'));
    let player = null;

    if (window.ytPlayersMap) {
      player = window.ytPlayersMap[cardId];
      if (!player && card) {
        player = window.ytPlayersMap[card.id];
        if (!player) {
          const iframe = card.querySelector('iframe');
          if (iframe) player = window.ytPlayersMap[iframe.id];
        }
      }
    }

    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(speedRate);
    } else if (card) {
      const videoEl = card.querySelector('video');
      if (videoEl) videoEl.playbackRate = speedRate;
    }

    if (btnElement && btnElement.parentElement) {
      const speedBtns = btnElement.parentElement.querySelectorAll('.btn-speed');
      speedBtns.forEach(b => {
        b.style.background = 'rgba(30, 41, 59, 0.8)';
        b.style.color = '#e2e8f0';
        b.style.fontWeight = '600';
      });
      btnElement.style.background = 'var(--accent-cyan)';
      btnElement.style.color = '#0a1128';
      btnElement.style.fontWeight = '800';
    }
  } catch(err) {}
}

function setAudioSpeed(audioId, speedRate, btnElement) {
  try {
    const audioEl = document.getElementById(audioId) || (btnElement && btnElement.closest('.card, .pillar-card') && btnElement.closest('.card, .pillar-card').querySelector('audio'));
    if (audioEl) audioEl.playbackRate = speedRate;

    if (btnElement && btnElement.parentElement) {
      const speedBtns = btnElement.parentElement.querySelectorAll('.btn-speed');
      speedBtns.forEach(b => {
        b.style.background = 'rgba(30, 41, 59, 0.8)';
        b.style.color = '#e2e8f0';
        b.style.fontWeight = '600';
      });
      btnElement.style.background = '#1ed760';
      btnElement.style.color = '#0a1128';
      btnElement.style.fontWeight = '800';
    }
  } catch(err) {}
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
window.setVideoSpeed = setVideoSpeed;
window.setAudioSpeed = setAudioSpeed;

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('iframe[src*="youtube.com"]')) {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    }
  }
});
