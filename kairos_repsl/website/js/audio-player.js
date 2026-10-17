/*
  LexClinic Education Platform — Audio Player & Playback Speed Controller
  Build Version: 20260829_2260
*/

// Prevent external iframe cross-origin postMessage & unload errors from breaking UI controls
window.addEventListener('error', function(e) {
  if (e && e.message && (e.message.includes('postMessage') || e.message.includes('unload') || e.message.includes('origin'))) {
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    return true;
  }
}, true);

// Set audio playback rate and highlight active speed button
function setAudioSpeed(playerId, rate, btn) {
  try {
    let player = document.getElementById(playerId);
    if (!player && btn) {
      const card = btn.closest('.card, .pillar-card, .event-module-card, div[style*="background"]');
      if (card) {
        player = card.querySelector('audio, video');
      }
    }

    if (!player) {
      player = document.querySelector('audio');
    }

    if (player) {
      player.playbackRate = parseFloat(rate);
      if (player.paused === false) {
        player.play().catch(() => {});
      }
    }

    const container = btn ? (btn.closest('.meter-speed-controls') || btn.parentElement) : null;
    if (container) {
      container.querySelectorAll('.btn-speed').forEach(b => {
        b.style.background = 'rgba(30, 41, 59, 0.8)';
        b.style.color = '#e2e8f0';
        b.style.borderColor = '#334155';
        b.style.fontWeight = '600';
      });
      btn.style.background = 'var(--accent-cyan)';
      btn.style.color = '#0a1128';
      btn.style.borderColor = 'var(--accent-cyan)';
      btn.style.fontWeight = '700';
    }
  } catch (err) {
    console.error('Error setting playback speed:', err);
  }
}

// Global scope exposure
window.setAudioSpeed = setAudioSpeed;
