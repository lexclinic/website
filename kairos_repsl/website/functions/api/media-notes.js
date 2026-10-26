/*
  LexClinic Education Platform — Shared Media Notes & Approvals API Endpoint
  Persists to shared Google Drive JSON Ledger (1FcH5BakIJTMoyr5spdIW9WAaxB8mri0b)
  shared between stage.lex.clinic and lex.clinic, with Cloudflare KV cache fallback.
*/
const DEFAULT_LEDGER_DRIVE_ID = "1FcH5BakIJTMoyr5spdIW9WAaxB8mri0b";
const FALLBACK_CLIENT_ID = "288664971084-dt9rnn61mj4ej185qcr7chr5du63cao1.apps.googleusercontent.com";

async function getDriveAccessToken(env = {}) {
  const clientId = (env && env.GOOGLE_CLIENT_ID) || FALLBACK_CLIENT_ID;
  const clientSecret = (env && env.GOOGLE_CLIENT_SECRET) || "";
  const refreshToken = (env && env.GOOGLE_REFRESH_TOKEN) || "";

  if (!clientSecret || !refreshToken) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function readSharedLedger(env = {}) {
  const driveId = (env && env.MEDIA_LEDGER_DRIVE_ID) || DEFAULT_LEDGER_DRIVE_ID;
  const token = await getDriveAccessToken(env);

  let ledger = {
    meta: {
      system: "LexClinic Legal Engineering Media Notes, Approvals & Watch History Shared Ledger",
      version: "2.1.0",
      updated_at: new Date().toISOString()
    },
    approvals: {},
    notes: [],
    watch_history: {}
  };

  if (token) {
    const fileUrl = `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media`;
    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      try {
        const parsed = await res.json();
        if (parsed && typeof parsed === "object") {
          ledger.approvals = parsed.approvals || {};
          ledger.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
          ledger.watch_history = parsed.watch_history || {};
          if (parsed.meta) ledger.meta = parsed.meta;
        }
      } catch (e) {}
    }
  }

  return { ledger, token, driveId };
}

async function writeSharedLedger(token, driveId, ledger) {
  if (!token || !driveId) return false;
  ledger.meta = ledger.meta || {};
  ledger.meta.updated_at = new Date().toISOString();

  const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${driveId}?uploadType=media`;
  const patchRes = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ledger, null, 2)
  });

  return patchRes.ok;
}

function applyItemToLedger(ledger, item) {
  if (!item || typeof item !== "object") return false;
  let changed = false;

  const uid = item.uid || ((item.page_url || "/") + "#" + (item.card_id || "unknown"));
  const cardId = item.card_id || (uid.includes("#") ? uid.split("#")[1] : uid);
  const reviewer = (item.reviewer || "kyle@lex.clinic").trim().toLowerCase();
  const timestamp = item.timestamp || new Date().toISOString();

  // 1. Handle Approval Rating
  if (item.rating) {
    const existing = ledger.approvals[uid] || ledger.approvals[cardId];
    const isNewer = !existing || !existing.timestamp || new Date(timestamp) >= new Date(existing.timestamp);
    if (isNewer) {
      const record = {
        uid,
        card_id: cardId,
        page_url: item.page_url || (uid.includes("#") ? uid.split("#")[0] : "/"),
        rating: item.rating,
        depth: item.depth || "thorough",
        reviewer,
        timestamp
      };
      ledger.approvals[uid] = record;
      changed = true;
    }
  }

  // 2. Handle Note / Comment
  if (item.comment && String(item.comment).trim()) {
    const cleanComment = String(item.comment).trim();
    const duplicate = ledger.notes.some(
      n => (n.uid === uid || n.card_id === cardId) &&
           n.comment === cleanComment &&
           (n.reviewer || "").toLowerCase() === reviewer
    );
    if (!duplicate) {
      ledger.notes.unshift({
        id: item.id || ("n-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6)),
        uid,
        card_id: cardId,
        page_url: item.page_url || (uid.includes("#") ? uid.split("#")[0] : "/"),
        reviewer,
        comment: cleanComment,
        timestamp
      });
      changed = true;
    }
  }

  // 3. Handle Watch Progress Record
  if (typeof item.progress === "number" && item.progress > 0) {
    ledger.watch_history = ledger.watch_history || {};
    const watchKey = `${reviewer}|${cardId}`;
    const existingWatch = ledger.watch_history[watchKey];
    const nextProg = Math.min(100, Math.max(0, Math.round(item.progress)));
    if (!existingWatch || nextProg > (existingWatch.progress || 0)) {
      ledger.watch_history[watchKey] = {
        uid,
        card_id: cardId,
        page_url: item.page_url || (uid.includes("#") ? uid.split("#")[0] : "/"),
        video_title: item.video_title || cardId,
        progress: nextProg,
        current_time: item.current_time || 0,
        user_email: reviewer,
        updated_at: timestamp
      };
      changed = true;
    }
  }

  return changed;
}

export async function onRequestGet(context) {
  try {
    const { ledger } = await readSharedLedger(context.env);

    return new Response(JSON.stringify({
      status: "success",
      updated_at: ledger.meta ? ledger.meta.updated_at : new Date().toISOString(),
      total_approvals: Object.keys(ledger.approvals || {}).length,
      total_notes: (ledger.notes || []).length,
      approvals: ledger.approvals || {},
      notes: ledger.notes || [],
      watch_history: ledger.watch_history || {}
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const { ledger, token, driveId } = await readSharedLedger(context.env);

    let changed = false;

    // Support both single item POST and bulk sync { items: [...] }
    if (Array.isArray(payload.items)) {
      for (const item of payload.items) {
        if (applyItemToLedger(ledger, item)) {
          changed = true;
        }
      }
    } else {
      if (applyItemToLedger(ledger, payload)) {
        changed = true;
      }
    }

    if (changed && token) {
      await writeSharedLedger(token, driveId, ledger);
    }

    return new Response(JSON.stringify({
      status: "success",
      persisted: changed,
      total_approvals: Object.keys(ledger.approvals || {}).length,
      total_notes: (ledger.notes || []).length,
      approvals: ledger.approvals || {},
      notes: ledger.notes || [],
      watch_history: ledger.watch_history || {}
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
