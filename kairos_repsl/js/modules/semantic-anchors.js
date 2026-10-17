/*
  LexClinic Education Platform — Semantic Anchors & Direct Link Generator
*/
function copyCardDirectLink(cardId, btnEl) {
  try {
    const card = (btnEl && btnEl.closest) ? btnEl.closest('[id]') : document.getElementById(cardId);
    const targetId = card ? card.id : cardId;
    const fullUrl = window.location.origin + window.location.pathname + '#' + targetId;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        showCopyFeedback(btnEl);
      }).catch(() => {
        fallbackCopyText(fullUrl, btnEl);
      });
    } else {
      fallbackCopyText(fullUrl, btnEl);
    }
  } catch(e) {}
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

window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.transition = 'box-shadow 0.6s ease, border-color 0.6s ease';
        targetEl.style.borderColor = '#fbbf24';
        targetEl.style.boxShadow = '0 0 30px rgba(251, 191, 36, 0.85)';
        
        setTimeout(() => {
          targetEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
        }, 3500);
      }, 400);
    }
  }
});
