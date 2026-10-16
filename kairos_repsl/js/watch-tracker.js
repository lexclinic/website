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


// ============================================================================
// LOGGED-IN MEDIA COMMENTS & APPROVAL STATE MANAGER
// ============================================================================

// Check Login Helper
function checkLoggedUserOrPrompt(evt) {
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  if (!userEmail) {
    if (window.openNavLoginModal) {
      window.openNavLoginModal(evt || window.event);
    } else {
      alert("🔒 Please log in to make comments and assign approval ratings.");
    }
    return null;
  }
  return userEmail;
}

// ----------------------------------------------------------------------------
// 1. COMMENTS MODAL & LOCAL STORAGE SYNC
// ----------------------------------------------------------------------------
function openMediaCommentModal(cardId, evt) {
  const userEmail = checkLoggedUserOrPrompt(evt);
  if (!userEmail) return;

  let modal = document.getElementById('media-comment-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'media-comment-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 17, 40, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem;';
    document.body.appendChild(modal);
  }

  const allComments = JSON.parse(localStorage.getItem('lexclinic_media_comments') || '{}');
  const cardComments = allComments[cardId] || '';

  modal.innerHTML = `
    <div style="background: #0f172a; border: 2px solid var(--accent-gold); border-radius: 12px; width: 100%; max-width: 550px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
        <h3 style="color: var(--accent-gold); font-size: 1.2rem; margin: 0;">💬 Clip Notes &amp; Comments</h3>
        <button onclick="document.getElementById('media-comment-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.75rem;">
        Logged in as: <strong style="color: var(--accent-cyan);">${userEmail}</strong> | Clip ID: <code style="color: #fbbf24;">${cardId}</code>
      </p>
      <textarea id="media-comment-textarea" placeholder="Write private notes, timestamps, or feedback for this clip..." style="width: 100%; height: 140px; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #f8fafc; padding: 0.75rem; font-family: inherit; font-size: 0.95rem; resize: vertical; margin-bottom: 1rem;">${cardComments}</textarea>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button onclick="document.getElementById('media-comment-modal').style.display='none'" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">Cancel</button>
        <button onclick="saveMediaComment('${cardId}')" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; border: none; padding: 0.4rem 1.25rem; border-radius: 6px; cursor: pointer;">Save Note 💾</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function saveMediaComment(cardId) {
  const textarea = document.getElementById('media-comment-textarea');
  if (!textarea) return;

  const noteText = textarea.value.strip ? textarea.value.strip() : textarea.value.trim();
  const allComments = JSON.parse(localStorage.getItem('lexclinic_media_comments') || '{}');

  allComments[cardId] = noteText;
  localStorage.setItem('lexclinic_media_comments', JSON.stringify(allComments));

  // Update button visual state
  const btn = document.querySelector(`.btn-comment-${cardId}`);
  if (btn) {
    if (noteText) {
      btn.innerHTML = '💬 Notes (1)';
      btn.style.background = 'rgba(251, 191, 36, 0.25)';
      btn.style.borderColor = '#fbbf24';
      btn.style.color = '#fbbf24';
    } else {
      btn.innerHTML = '💬 Notes';
      btn.style.background = 'rgba(56, 189, 248, 0.15)';
      btn.style.borderColor = 'var(--accent-cyan)';
      btn.style.color = 'var(--accent-cyan)';
    }
  }

  document.getElementById('media-comment-modal').style.display = 'none';
}

window.openMediaCommentModal = openMediaCommentModal;
window.saveMediaComment = saveMediaComment;


// ----------------------------------------------------------------------------
// 2. APPROVAL STATE (FAIL, FLAG, PASS, STAR) & LOCAL STORAGE SYNC
// ----------------------------------------------------------------------------
function openMediaApprovalModal(cardId, evt) {
  const userEmail = checkLoggedUserOrPrompt(evt);
  if (!userEmail) return;

  let modal = document.getElementById('media-approval-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'media-approval-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 17, 40, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem;';
    document.body.appendChild(modal);
  }

  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');
  const currentApproval = allApprovals[cardId] || 'none';

  modal.innerHTML = `
    <div style="background: #0f172a; border: 2px solid var(--accent-cyan); border-radius: 12px; width: 100%; max-width: 480px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
        <h3 style="color: var(--accent-cyan); font-size: 1.2rem; margin: 0;">👍 Clip Approval Rating</h3>
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">
        Logged in as: <strong style="color: var(--accent-cyan);">${userEmail}</strong> | Select evaluation rating:
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
        <button onclick="setMediaApproval('${cardId}', 'pass')" style="padding: 0.75rem; background: rgba(52, 211, 153, 0.15); border: 2px solid #34d399; color: #34d399; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">✅ Pass</button>
        <button onclick="setMediaApproval('${cardId}', 'star')" style="padding: 0.75rem; background: rgba(251, 191, 36, 0.15); border: 2px solid #fbbf24; color: #fbbf24; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">⭐ Star</button>
        <button onclick="setMediaApproval('${cardId}', 'flag')" style="padding: 0.75rem; background: rgba(249, 115, 22, 0.15); border: 2px solid #f97316; color: #f97316; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">🚩 Flag</button>
        <button onclick="setMediaApproval('${cardId}', 'fail')" style="padding: 0.75rem; background: rgba(248, 113, 113, 0.15); border: 2px solid #f87171; color: #f87171; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">❌ Fail</button>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">Close</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function setMediaApproval(cardId, ratingState) {
  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');
  allApprovals[cardId] = ratingState;
  localStorage.setItem('lexclinic_media_approvals', JSON.stringify(allApprovals));

  // Update button visual state
  updateApprovalButtonUI(cardId, ratingState);

  document.getElementById('media-approval-modal').style.display = 'none';
}

function updateApprovalButtonUI(cardId, ratingState) {
  const btn = document.querySelector(`.btn-approval-${cardId}`);
  if (!btn) return;

  if (ratingState === 'pass') {
    btn.innerHTML = '✅ Passed';
    btn.style.background = 'rgba(52, 211, 153, 0.2)';
    btn.style.borderColor = '#34d399';
    btn.style.color = '#34d399';
  } else if (ratingState === 'star') {
    btn.innerHTML = '⭐ Starred';
    btn.style.background = 'rgba(251, 191, 36, 0.2)';
    btn.style.borderColor = '#fbbf24';
    btn.style.color = '#fbbf24';
  } else if (ratingState === 'flag') {
    btn.innerHTML = '🚩 Flagged';
    btn.style.background = 'rgba(249, 115, 22, 0.2)';
    btn.style.borderColor = '#f97316';
    btn.style.color = '#f97316';
  } else if (ratingState === 'fail') {
    btn.innerHTML = '❌ Failed';
    btn.style.background = 'rgba(248, 113, 113, 0.2)';
    btn.style.borderColor = '#f87171';
    btn.style.color = '#f87171';
  } else {
    btn.innerHTML = '👍 Approval';
    btn.style.background = 'rgba(56, 189, 248, 0.15)';
    btn.style.borderColor = 'var(--accent-cyan)';
    btn.style.color = 'var(--accent-cyan)';
  }
}

window.openMediaApprovalModal = openMediaApprovalModal;
window.setMediaApproval = setMediaApproval;

// Auto-restore comments and approval button states on load
document.addEventListener('DOMContentLoaded', () => {
  const allComments = JSON.parse(localStorage.getItem('lexclinic_media_comments') || '{}');
  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');

  Object.keys(allComments).forEach(cardId => {
    if (allComments[cardId]) {
      const btn = document.querySelector(`.btn-comment-${cardId}`);
      if (btn) {
        btn.innerHTML = '💬 Notes (1)';
        btn.style.background = 'rgba(251, 191, 36, 0.25)';
        btn.style.borderColor = '#fbbf24';
        btn.style.color = '#fbbf24';
      }
    }
  });

  Object.keys(allApprovals).forEach(cardId => {
    updateApprovalButtonUI(cardId, allApprovals[cardId]);
  });
});
