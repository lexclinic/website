/*
  LexClinic Education Platform — Player Adapter, YouTube API Orchestrator & Screen Wake Lock
  Build Version: 20260829_2700
*/


// ============================================================================
function copyCardDirectLink(cardId, btnEl) {
  const fullUrl = window.location.origin + window.location.pathname + '#' + cardId;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showCopyFeedback(btnEl);
    }).catch(() => {
      fallbackCopyText(fullUrl, btnEl);
    });
  } else {
    fallbackCopyText(fullUrl, btnEl);
  }
}

function fallbackCopyText(text, btnEl) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showCopyFeedback(btnEl);
}

function showCopyFeedback(btnEl) {
  if (!btnEl) return;
  const originalText = btnEl.innerHTML;
  btnEl.innerHTML = '✅ Link Copied!';
  btnEl.style.background = '#34d399';
  btnEl.style.color = '#0a1128';
  btnEl.style.borderColor = '#34d399';
  
  setTimeout(() => {
    btnEl.innerHTML = originalText;
    btnEl.style.background = 'rgba(56, 189, 248, 0.15)';
    btnEl.style.color = 'var(--accent-cyan)';
    btnEl.style.borderColor = 'var(--accent-cyan)';
  }, 2200);
}

window.copyCardDirectLink = copyCardDirectLink;

// Auto-bind Copy Link buttons on all cards with IDs
window.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.pillar-card[id], .card[id]');
  cards.forEach(card => {
    const cardId = card.id;
    if (!cardId) return;

    // Check if controls bar exists
    let controlsBar = card.querySelector('div[style*="justify-content: space-between"]');
    
    // Inject Copy Link button if not already present
    if (controlsBar && !card.querySelector('.btn-copy-link')) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-copy-link';
      copyBtn.innerHTML = '🔗 Copy Direct Link';
      copyBtn.style.cssText = 'padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700; transition: all 0.2s ease; margin-left: auto;';
      
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyCardDirectLink(cardId, copyBtn);
      });
      
      controlsBar.appendChild(copyBtn);
    }
  });
});


// ============================================================================
// INTERACTIVE "COPY DIRECT LINK" BUTTON & ANCHOR HELPER
// ============================================================================
function copyCardDirectLink(cardId, btnEl) {
  const fullUrl = window.location.origin + window.location.pathname + '#' + cardId;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showCopyFeedback(btnEl);
    }).catch(() => {
      fallbackCopyText(fullUrl, btnEl);
    });
  } else {
    fallbackCopyText(fullUrl, btnEl);
  }
}

function fallbackCopyText(text, btnEl) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showCopyFeedback(btnEl);
}

function showCopyFeedback(btnEl) {
  if (!btnEl) return;
  const originalText = btnEl.innerHTML;
  btnEl.innerHTML = '✅ Link Copied!';
  btnEl.style.background = '#34d399';
  btnEl.style.color = '#0a1128';
  btnEl.style.borderColor = '#34d399';
  
  setTimeout(() => {
    btnEl.innerHTML = originalText;
    btnEl.style.background = 'rgba(56, 189, 248, 0.15)';
    btnEl.style.color = 'var(--accent-cyan)';
    btnEl.style.borderColor = 'var(--accent-cyan)';
  }, 2200);
}

window.copyCardDirectLink = copyCardDirectLink;

// Auto-bind Copy Link buttons on all cards with IDs
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.pillar-card[id], .card[id]');
  cards.forEach(card => {
    const cardId = card.id;
    if (!cardId) return;

    // Find speed control bar
    const speedBtn = card.querySelector('.btn-speed');
    let controlsBar = speedBtn ? speedBtn.closest('div[style*="display: flex"]') : null;
    if (controlsBar && controlsBar.parentElement) {
      controlsBar = controlsBar.parentElement;
    }
    
    // Inject Copy Link button if not already present
    if (controlsBar && !card.querySelector('.btn-copy-link')) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-copy-link';
      copyBtn.innerHTML = '🔗 Copy Direct Link';
      copyBtn.style.cssText = 'padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700; transition: all 0.2s ease; margin-left: 0.5rem;';
      
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyCardDirectLink(cardId, copyBtn);
      });
      
      controlsBar.appendChild(copyBtn);
    }
  });
});
