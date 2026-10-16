/*
  LexClinic Education Platform — Player Adapter, YouTube API Orchestrator & Screen Wake Lock
  Build Version: 20260829_2700
*/





// ============================================================================
// LOGGED-IN MEDIA COMMENTS & 2-STEP APPROVAL STATE MANAGER
// ============================================================================

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

  const noteText = textarea.value.trim ? textarea.value.trim() : textarea.value;
  const allComments = JSON.parse(localStorage.getItem('lexclinic_media_comments') || '{}');

  allComments[cardId] = noteText;
  localStorage.setItem('lexclinic_media_comments', JSON.stringify(allComments));

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
// 2. TWO-STEP APPROVAL MODAL (STEP 1: THOROUGH/CURSORY -> STEP 2: RATING)
// ----------------------------------------------------------------------------
let pendingApprovalDepth = {};

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

  // Render Step 1: Review Depth Selection
  renderApprovalStep1(modal, cardId, userEmail);
  modal.style.display = 'flex';
}

function renderApprovalStep1(modal, cardId, userEmail) {
  modal.innerHTML = `
    <div style="background: #0f172a; border: 2px solid var(--accent-cyan); border-radius: 12px; width: 100%; max-width: 500px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
        <h3 style="color: var(--accent-cyan); font-size: 1.2rem; margin: 0;">👍 Step 1: Human Review Scope</h3>
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">
        Logged in as: <strong style="color: var(--accent-cyan);">${userEmail}</strong> | Was this review thorough or cursory?
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
        <button onclick="selectApprovalDepth('${cardId}', 'thorough')" style="padding: 0.85rem; background: rgba(56, 189, 248, 0.15); border: 2px solid var(--accent-cyan); color: var(--accent-cyan); border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 1rem; text-align: left; display: flex; justify-content: space-between; align-items: center;">
          <span>🔍 Thorough Review (Full Human Audit)</span>
          <span>➔</span>
        </button>
        <button onclick="selectApprovalDepth('${cardId}', 'cursory')" style="padding: 0.85rem; background: rgba(251, 191, 36, 0.15); border: 2px solid #fbbf24; color: #fbbf24; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 1rem; text-align: left; display: flex; justify-content: space-between; align-items: center;">
          <span>⚡ Cursory Review (Partial Inspection)</span>
          <span>➔</span>
        </button>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">Cancel</button>
      </div>
    </div>
  `;
}

function selectApprovalDepth(cardId, depth) {
  pendingApprovalDepth[cardId] = depth;
  const modal = document.getElementById('media-approval-modal');
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  renderApprovalStep2(modal, cardId, userEmail, depth);
}

function renderApprovalStep2(modal, cardId, userEmail, depth) {
  const depthLabel = depth === 'thorough' ? '🔍 Thorough Review' : '⚡ Cursory Review';
  modal.innerHTML = `
    <div style="background: #0f172a; border: 2px solid var(--accent-gold); border-radius: 12px; width: 100%; max-width: 500px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
        <h3 style="color: var(--accent-gold); font-size: 1.2rem; margin: 0;">👍 Step 2: Assign Evaluation Rating</h3>
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem;">
        Review Scope: <strong style="color: #fbbf24;">${depthLabel}</strong>
      </p>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">
        Select approval rating for this clip:
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
        <button onclick="setMediaApproval('${cardId}', 'pass')" style="padding: 0.75rem; background: rgba(52, 211, 153, 0.15); border: 2px solid #34d399; color: #34d399; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">✅ Pass</button>
        <button onclick="setMediaApproval('${cardId}', 'star')" style="padding: 0.75rem; background: rgba(251, 191, 36, 0.15); border: 2px solid #fbbf24; color: #fbbf24; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">⭐ Star</button>
        <button onclick="setMediaApproval('${cardId}', 'flag')" style="padding: 0.75rem; background: rgba(249, 115, 22, 0.15); border: 2px solid #f97316; color: #f97316; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">🚩 Flag</button>
        <button onclick="setMediaApproval('${cardId}', 'fail')" style="padding: 0.75rem; background: rgba(248, 113, 113, 0.15); border: 2px solid #f87171; color: #f87171; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.95rem; text-align: center;">❌ Fail</button>
      </div>

      <div style="display: flex; justify-content: space-between;">
        <button onclick="renderApprovalStep1(document.getElementById('media-approval-modal'), '${cardId}', '${userEmail}')" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">← Back to Step 1</button>
        <button onclick="document.getElementById('media-approval-modal').style.display='none'" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">Cancel</button>
      </div>
    </div>
  `;
}

function setMediaApproval(cardId, ratingState) {
  const depth = pendingApprovalDepth[cardId] || 'thorough';
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";

  const record = {
    rating: ratingState,
    depth: depth,
    reviewer: userEmail,
    timestamp: new Date().toISOString()
  };

  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');
  allApprovals[cardId] = record;
  localStorage.setItem('lexclinic_media_approvals', JSON.stringify(allApprovals));

  updateApprovalButtonUI(cardId, record);
  document.getElementById('media-approval-modal').style.display = 'none';
}

function updateApprovalButtonUI(cardId, record) {
  const btn = document.querySelector(`.btn-approval-${cardId}`);
  if (!btn) return;

  const ratingState = typeof record === 'object' ? record.rating : record;
  const depth = (typeof record === 'object' && record.depth) ? record.depth : 'thorough';
  const depthTag = depth === 'thorough' ? 'Full' : 'Partial';

  if (ratingState === 'pass') {
    btn.innerHTML = `✅ Passed (${depthTag})`;
    btn.style.background = 'rgba(52, 211, 153, 0.2)';
    btn.style.borderColor = '#34d399';
    btn.style.color = '#34d399';
  } else if (ratingState === 'star') {
    btn.innerHTML = `⭐ Starred (${depthTag})`;
    btn.style.background = 'rgba(251, 191, 36, 0.2)';
    btn.style.borderColor = '#fbbf24';
    btn.style.color = '#fbbf24';
  } else if (ratingState === 'flag') {
    btn.innerHTML = `🚩 Flagged (${depthTag})`;
    btn.style.background = 'rgba(249, 115, 22, 0.2)';
    btn.style.borderColor = '#f97316';
    btn.style.color = '#f97316';
  } else if (ratingState === 'fail') {
    btn.innerHTML = `❌ Failed (${depthTag})`;
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
window.selectApprovalDepth = selectApprovalDepth;
window.setMediaApproval = setMediaApproval;

// ----------------------------------------------------------------------------
// 3. DYNAMIC AUTH-DEPENDENT BUTTON VISIBILITY (HIDE UNTIL LOGGED IN)
// ----------------------------------------------------------------------------
function updateAuthButtonVisibility() {
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  const authButtons = document.querySelectorAll('[class*="btn-comment-"], [class*="btn-approval-"]');
  
  authButtons.forEach(btn => {
    if (userEmail) {
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  });
}

window.updateAuthButtonVisibility = updateAuthButtonVisibility;

document.addEventListener('DOMContentLoaded', () => {
  updateAuthButtonVisibility();

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

// Re-check visibility when auth modal closes or state changes
window.addEventListener('storage', updateAuthButtonVisibility);
