const CLIENT_ID = "288664971084-dt9rnn61mj4ej185qcr7chr5du63cao1.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REFRESH_TOKEN = "1//06owsSactvT2qCgYIARAAGAYSNwF-L9IrGw8a2BNUsfUAbyfIMgWmf5GHdm9s-e3iZfhgUmhyAPToK6HBrHik5QPfvBApxjmto2A";
const DRIVE_FILE_ID = "1GidiMBXRYmcDMnAPrgndS35-MsjY1WT7";

async function getGoogleAccessToken() {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token"
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();
  return data.access_token;
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { email, score, answered, total, payload_hash, timestamp, summary } = data;

    if (!email || !payload_hash) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const newSubmission = {
      submissionId: "sub_" + Date.now(),
      email,
      score: `${score}/${total || 20}`,
      answered: `${answered}/${total || 20}`,
      payload_hash,
      timestamp: timestamp || new Date().toISOString(),
      summary: summary || []
    };

    // 1. Get Access Token
    const accessToken = await getGoogleAccessToken();

    // 2. Fetch Existing File Content from Google Drive
    const fileUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`;
    const getRes = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    let currentData = { submissions: [] };
    if (getRes.ok) {
      try {
        currentData = await getRes.json();
        if (!Array.isArray(currentData.submissions)) {
          currentData.submissions = [];
        }
      } catch (e) {
        currentData = { submissions: [] };
      }
    }

    // 3. Append New Submission
    currentData.submissions.push(newSubmission);

    // 4. Update File on Google Drive
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${DRIVE_FILE_ID}?uploadType=media`;
    const patchRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(currentData, null, 2)
    });

    const patchResult = await patchRes.json();

    return new Response(JSON.stringify({
      success: true,
      message: "Quiz submission recorded in Google Drive Store!",
      driveResult: patchResult,
      submissionCount: currentData.submissions.length,
      submission: newSubmission
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
