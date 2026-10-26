/*
  LexClinic Education Platform — Shared Community Discussion Feed & 2-Step Approval Manager
  Automatically synchronizes browser localStorage approvals & notes with /api/media-notes
  (backed by the shared Google Drive Ledger across stage.lex.clinic and lex.clinic).
*/
const LEGACY_CARD_ID_ALIASES = {
  "lucas-kung-interview-audio-stream": "lucas-kung-interview-full-audio-stream",
  "lucas-kung-interview-full-audio-stream": "lucas-kung-interview-audio-stream",
  "lucas-kung-interview-clip-1": "card_interview_lucas_v1_1",
  "card_interview_lucas_v1_1": "lucas-kung-interview-clip-1",
  "lucas-kung-interview-clip-2": "card_interview_lucas_v1_2",
  "card_interview_lucas_v1_2": "lucas-kung-interview-clip-2",
  "lucas-kung-interview-clip-3": "card_interview_lucas_v1_3",
  "card_interview_lucas_v1_3": "lucas-kung-interview-clip-3"
};

let sharedServerNotes = [];
let sharedServerApprovals = {};

function checkLoggedUserOrPrompt(evt) {
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  if (!userEmail) {
    if (window.openNavLoginModal) {
      window.openNavLoginModal(evt || window.event);
    } else {
      alert("🔒 Please log in to view and post in the shared community discussion feed.");
    }
    return null;
  }
  return userEmail;
}

function getAllCandidateIds(cardId) {
  const set = new Set([cardId]);
  if (LEGACY_CARD_ID_ALIASES[cardId]) {
    set.add(LEGACY_CARD_ID_ALIASES[cardId]);
  }
  return Array.from(set);
}

// ----------------------------------------------------------------------------
// 1. SHARED COMMUNITY DISCUSSION FEED MODAL
// ----------------------------------------------------------------------------
async function openMediaCommentModal(cardId, evt) {
  const userEmail = checkLoggedUserOrPrompt(evt);
  if (!userEmail) return;

  const canonicalUid = window.location.pathname + '#' + cardId;
  const candidateIds = getAllCandidateIds(cardId);

  let modal = document.getElementById('media-comment-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'media-comment-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 17, 40, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem;';
    document.body.appendChild(modal);
  }

  // Fetch shared community comment feed + live /api/media-notes
  let feedComments = [];
  try {
    const res = await fetch('/media-comments-feed.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      feedComments = (data.comments || []).filter(c => c.uid === canonicalUid || candidateIds.includes(c.card_id));
    }
  } catch(e) {}

  const serverCardNotes = sharedServerNotes.filter(
    c => c.uid === canonicalUid || candidateIds.includes(c.card_id)
  );

  // Local browser saved notes
  const historyStore = JSON.parse(localStorage.getItem('lexclinic_notes_history') || '{}');
  let localHistory = [];
  if (Array.isArray(historyStore[canonicalUid])) localHistory.push(...historyStore[canonicalUid]);
  candidateIds.forEach(cid => {
    if (Array.isArray(historyStore[cid])) localHistory.push(...historyStore[cid]);
  });

  const combined = [...feedComments];

  [...serverCardNotes, ...localHistory].forEach(lh => {
    if (lh && lh.comment && !combined.some(c => c.comment === lh.comment && (c.reviewer || '').toLowerCase() === (lh.reviewer || '').toLowerCase())) {
      combined.push({
        uid: lh.uid || canonicalUid,
        card_id: cardId,
        reviewer: lh.reviewer || 'kyle@lex.clinic',
        comment: lh.comment,
        timestamp: lh.timestamp || new Date().toISOString()
      });
    }
  });

  combined.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  let threadHtml = '';
  if (combined.length > 0) {
    threadHtml = '<div style="margin-top: 1rem; border-top: 1px solid #334155; padding-top: 0.75rem;"><h4 style="color: var(--accent-cyan); font-size: 0.95rem; margin-bottom: 0.5rem;">💬 Community Discussion Thread (' + combined.length + '):</h4><div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; padding-right: 0.25rem;">';
    combined.forEach(c => {
      const dt = new Date(c.timestamp).toLocaleString();
      threadHtml += `<div style="background: #1e293b; padding: 0.65rem 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-gold); font-size: 0.88rem;"><div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.25rem; display: flex; justify-content: space-between;"><span>👤 <strong style="color: var(--accent-cyan);">${c.reviewer || 'kyle@lex.clinic'}</strong></span><span>🕒 ${dt}</span></div><div style="color: #f8fafc; line-height: 1.5;">${c.comment}</div></div>`;
    });
    threadHtml += '</div></div>';
  } else {
    threadHtml = '<div style="margin-top: 1rem; border-top: 1px solid #334155; padding-top: 0.75rem; color: #94a3b8; font-size: 0.85rem; font-style: italic;">No notes posted yet on this clip. Be the first to start the community discussion!</div>';
  }

  modal.innerHTML = `
    <div style="background: #0f172a; border: 2px solid var(--accent-gold); border-radius: 12px; width: 100%; max-width: 600px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
        <h3 style="color: var(--accent-gold); font-size: 1.25rem; margin: 0;">💬 Shared Community Discussion &amp; Notes</h3>
        <button onclick="document.getElementById('media-comment-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.75rem;">
        Logged in as: <strong style="color: var(--accent-cyan);">${userEmail}</strong> | UID: <code style="color: #fbbf24; word-break: break-all;">${canonicalUid}</code>
      </p>
      
      <textarea id="media-comment-textarea" placeholder="Write a note or comment for the community..." style="width: 100%; height: 110px; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #f8fafc; padding: 0.75rem; font-family: inherit; font-size: 0.95rem; resize: vertical; margin-bottom: 0.75rem;"></textarea>
      
      ${threadHtml}

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
        <button onclick="document.getElementById('media-comment-modal').style.display='none'" class="btn" style="background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer;">Close</button>
        <button onclick="saveMediaComment('${cardId}')" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; border: none; padding: 0.45rem 1.35rem; border-radius: 6px; cursor: pointer;">Post Comment 💬</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function saveMediaComment(cardId) {
  const textarea = document.getElementById('media-comment-textarea');
  if (!textarea) return;

  const noteText = textarea.value.trim ? textarea.value.trim() : textarea.value;
  if (!noteText) return;

  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  const timestamp = new Date().toISOString();
  const canonicalUid = window.location.pathname + '#' + cardId;
  
  const allHistory = JSON.parse(localStorage.getItem('lexclinic_notes_history') || '{}');
  if (!allHistory[canonicalUid]) allHistory[canonicalUid] = [];

  const noteEntry = {
    uid: canonicalUid,
    card_id: cardId,
    page_url: window.location.pathname,
    comment: noteText,
    reviewer: userEmail,
    timestamp: timestamp
  };

  allHistory[canonicalUid].unshift(noteEntry);
  localStorage.setItem('lexclinic_notes_history', JSON.stringify(allHistory));

  sharedServerNotes.unshift(noteEntry);
  syncToAgentLedger(cardId, userEmail, { comment: noteText, uid: canonicalUid, timestamp });

  updateCommentButtonUI(cardId, allHistory[canonicalUid].length);
  document.getElementById('media-comment-modal').style.display = 'none';
}

function updateCommentButtonUI(cardId, count) {
  const candidateIds = getAllCandidateIds(cardId);
  candidateIds.forEach(cid => {
    const btn = document.querySelector(`.btn-comment-${cid}`);
    if (btn && count > 0) {
      btn.innerHTML = `💬 Notes (${count})`;
      btn.style.background = 'rgba(251, 191, 36, 0.25)';
      btn.style.borderColor = '#fbbf24';
      btn.style.color = '#fbbf24';
    }
  });
}

// ----------------------------------------------------------------------------
// 2. TWO-STEP APPROVAL MODAL (THOROUGH/CURSORY -> RATING)
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
  const canonicalUid = window.location.pathname + '#' + cardId;

  const record = {
    uid: canonicalUid,
    card_id: cardId,
    page_url: window.location.pathname,
    rating: ratingState,
    depth: depth,
    reviewer: userEmail,
    timestamp: new Date().toISOString()
  };

  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');
  allApprovals[canonicalUid] = record;
  allApprovals[cardId] = record;
  localStorage.setItem('lexclinic_media_approvals', JSON.stringify(allApprovals));

  sharedServerApprovals[canonicalUid] = record;
  syncToAgentLedger(cardId, userEmail, record);
  updateApprovalButtonUI(cardId, record);
  document.getElementById('media-approval-modal').style.display = 'none';
}

function syncToAgentLedger(cardId, userEmail, payload) {
  try {
    fetch('/api/media-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: window.location.pathname + '#' + cardId,
        card_id: cardId,
        reviewer: userEmail,
        page_url: window.location.pathname,
        ...payload
      })
    }).catch(() => {});
  } catch(e) {}
}

function updateApprovalButtonUI(cardId, record) {
  const candidateIds = getAllCandidateIds(cardId);
  candidateIds.forEach(cid => {
    const btn = document.querySelector(`.btn-approval-${cid}`);
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
  });
}

function updateAuthButtonVisibility() {
  const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
  if (userEmail) {
    document.body.classList.add('auth-logged-in');
  } else {
    document.body.classList.remove('auth-logged-in');
  }
}

// Gather all localStorage approvals, notes & watch history and sync with /api/media-notes
async function syncAndHydrateMediaLedger() {
  const allHistory = JSON.parse(localStorage.getItem('lexclinic_notes_history') || '{}');
  const allApprovals = JSON.parse(localStorage.getItem('lexclinic_media_approvals') || '{}');
  const allWatchHistory = JSON.parse(localStorage.getItem('lexclinic_video_watch_history') || '{}');
  const legacyComments = JSON.parse(localStorage.getItem('lexclinic_media_comments') || '{}');
  const userEmail = (window.getSanitizedEmail ? window.getSanitizedEmail() : "") || (localStorage.getItem("lexclinic_user_email") || "").toLowerCase().trim() || "kyle@lex.clinic";

  // 1. Immediately hydrate buttons from localStorage
  Object.keys(allHistory).forEach(key => {
    const cardId = key.includes('#') ? key.split('#')[1] : key;
    if (Array.isArray(allHistory[key]) && allHistory[key].length > 0) {
      updateCommentButtonUI(cardId, allHistory[key].length);
    }
  });

  Object.keys(allApprovals).forEach(key => {
    const cardId = key.includes('#') ? key.split('#')[1] : key;
    updateApprovalButtonUI(cardId, allApprovals[key]);
  });

  // 2. Collect any localStorage items to push to shared server ledger
  const localItemsToPush = [];
  const seenApprovalUids = new Set();

  Object.keys(allApprovals).forEach(key => {
    const rec = allApprovals[key];
    if (!rec) return;
    const uid = (typeof rec === 'object' && rec.uid) ? rec.uid : key;
    if (seenApprovalUids.has(uid)) return;
    seenApprovalUids.add(uid);

    const cardId = uid.includes('#') ? uid.split('#')[1] : uid;
    localItemsToPush.push({
      uid: uid,
      card_id: cardId,
      page_url: (typeof rec === 'object' && rec.page_url) ? rec.page_url : (uid.includes('#') ? uid.split('#')[0] : window.location.pathname),
      rating: typeof rec === 'object' ? rec.rating : rec,
      depth: (typeof rec === 'object' && rec.depth) ? rec.depth : 'thorough',
      reviewer: (typeof rec === 'object' && rec.reviewer) ? rec.reviewer : userEmail,
      timestamp: (typeof rec === 'object' && rec.timestamp) ? rec.timestamp : new Date().toISOString()
    });
  });

  Object.keys(allHistory).forEach(key => {
    const arr = allHistory[key];
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (item && item.comment) {
          const uid = item.uid || key;
          const cardId = item.card_id || (uid.includes('#') ? uid.split('#')[1] : uid);
          localItemsToPush.push({
            uid: uid,
            card_id: cardId,
            page_url: item.page_url || (uid.includes('#') ? uid.split('#')[0] : window.location.pathname),
            comment: item.comment,
            reviewer: item.reviewer || userEmail,
            timestamp: item.timestamp || new Date().toISOString()
          });
        }
      });
    }
  });

  Object.keys(allWatchHistory).forEach(cardId => {
    const wRec = allWatchHistory[cardId];
    if (wRec && typeof wRec.progress === 'number' && wRec.progress > 0) {
      const pageUrl = wRec.page_url || window.location.pathname;
      localItemsToPush.push({
        uid: pageUrl + '#' + cardId,
        card_id: cardId,
        page_url: pageUrl,
        video_title: wRec.video_title || cardId,
        progress: wRec.progress,
        current_time: wRec.current_time || 0,
        reviewer: wRec.user_email || userEmail,
        timestamp: wRec.updated_at || wRec.timestamp || new Date().toISOString()
      });
    }
  });

  Object.keys(legacyComments).forEach(cardId => {
    const text = legacyComments[cardId];
    if (text && typeof text === 'string' && text.trim()) {
      localItemsToPush.push({
        uid: '#' + cardId,
        card_id: cardId,
        comment: text.trim(),
        reviewer: userEmail,
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    let res;
    if (localItemsToPush.length > 0) {
      res = await fetch('/api/media-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localItemsToPush })
      });
    } else {
      res = await fetch('/api/media-notes');
    }

    if (res && res.ok) {
      const data = await res.json();
      sharedServerApprovals = data.approvals || {};
      sharedServerNotes = Array.isArray(data.notes) ? data.notes : [];
      const sharedWatchHistory = data.watch_history || {};

      // Merge server approvals back into localStorage & hydrate DOM buttons
      let mergedApprovals = { ...allApprovals };
      let mergedWatch = { ...allWatchHistory };

      Object.keys(sharedServerApprovals).forEach(uid => {
        const rec = sharedServerApprovals[uid];
        if (rec && rec.rating) {
          const cardId = rec.card_id || (uid.includes('#') ? uid.split('#')[1] : uid);
          mergedApprovals[uid] = rec;
          mergedApprovals[cardId] = rec;
          updateApprovalButtonUI(cardId, rec);

          // If the active user approved this card (or reviewed it thoroughly), also hydrate watch history so the meter shows 100% Watched!
          if (!rec.reviewer || rec.reviewer.toLowerCase() === userEmail.toLowerCase()) {
            const targetProg = rec.depth === 'cursory' ? 50 : 100;
            if (!mergedWatch[cardId] || (mergedWatch[cardId].progress || 0) < targetProg) {
              mergedWatch[cardId] = {
                video_id: cardId,
                card_id: cardId,
                page_url: rec.page_url || (uid.includes('#') ? uid.split('#')[0] : window.location.pathname),
                progress: targetProg,
                current_time: 0,
                video_title: cardId,
                user_email: rec.reviewer || userEmail,
                timestamp: rec.timestamp || new Date().toISOString(),
                updated_at: rec.timestamp || new Date().toISOString()
              };
            }
          }
        }
      });

      // Merge server watch_history records for this user
      Object.keys(sharedWatchHistory).forEach(wKey => {
        const wRec = sharedWatchHistory[wKey];
        if (wRec && wRec.card_id && (!wRec.user_email || wRec.user_email.toLowerCase() === userEmail.toLowerCase())) {
          const cid = wRec.card_id;
          if (!mergedWatch[cid] || (wRec.progress || 0) > (mergedWatch[cid].progress || 0)) {
            mergedWatch[cid] = {
              video_id: cid,
              card_id: cid,
              page_url: wRec.page_url || window.location.pathname,
              progress: wRec.progress,
              current_time: wRec.current_time || 0,
              video_title: wRec.video_title || cid,
              user_email: wRec.user_email || userEmail,
              timestamp: wRec.updated_at || new Date().toISOString(),
              updated_at: wRec.updated_at || new Date().toISOString()
            };
          }
        }
      });

      localStorage.setItem('lexclinic_media_approvals', JSON.stringify(mergedApprovals));
      localStorage.setItem('lexclinic_video_watch_history', JSON.stringify(mergedWatch));

      // Re-refresh all MediaTrackerMeter bars on the page now that approvals & watch history are hydrated!
      if (window.initAllMediaMeters) {
        window.initAllMediaMeters();
      }

      // Hydrate comment counts from server notes
      const noteCountsByCard = {};
      sharedServerNotes.forEach(n => {
        const cid = n.card_id || (n.uid && n.uid.includes('#') ? n.uid.split('#')[1] : '');
        if (cid) {
          noteCountsByCard[cid] = (noteCountsByCard[cid] || 0) + 1;
        }
      });
      Object.keys(noteCountsByCard).forEach(cid => {
        updateCommentButtonUI(cid, noteCountsByCard[cid]);
      });

      window.dispatchEvent(new CustomEvent('lexclinic:media-ledger-synced', { detail: data }));
    }
  } catch (err) {}
}

window.checkLoggedUserOrPrompt = checkLoggedUserOrPrompt;
window.openMediaCommentModal = openMediaCommentModal;
window.saveMediaComment = saveMediaComment;
window.openMediaApprovalModal = openMediaApprovalModal;
window.renderApprovalStep1 = renderApprovalStep1;
window.renderApprovalStep2 = renderApprovalStep2;
window.selectApprovalDepth = selectApprovalDepth;
window.setMediaApproval = setMediaApproval;
window.syncToAgentLedger = syncToAgentLedger;
window.updateApprovalButtonUI = updateApprovalButtonUI;
window.updateAuthButtonVisibility = updateAuthButtonVisibility;
window.syncAndHydrateMediaLedger = syncAndHydrateMediaLedger;

// CRITICAL FIX: Because watch-tracker.js injects media-comments-approval.js dynamically,
// DOMContentLoaded has often ALREADY fired by the time this script executes!
// Always run immediately if readyState !== 'loading', AND also bind DOMContentLoaded as fallback.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateAuthButtonVisibility();
    syncAndHydrateMediaLedger();
  });
} else {
  updateAuthButtonVisibility();
  syncAndHydrateMediaLedger();
}

window.addEventListener('storage', () => {
  updateAuthButtonVisibility();
  syncAndHydrateMediaLedger();
});
