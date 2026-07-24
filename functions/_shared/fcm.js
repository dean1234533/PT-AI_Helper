/**
 * Shared helper for sending Firebase Cloud Messaging push notifications from
 * Cloudflare Pages Functions (Web Crypto only — no Node crypto/Admin SDK).
 * The leading underscore on this directory excludes it from Pages' automatic
 * function-routing, so it's safe to import from other function files.
 *
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FCM_SERVICE_ACCOUNT_JSON
 */

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

function base64UrlEncode(bytes) {
  let str = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function mintAccessToken(env) {
  const raw = getenv('FCM_SERVICE_ACCOUNT_JSON', env);
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON is not configured on the server.');
  const account = JSON.parse(raw);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encClaims = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encHeader}.${encClaims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, projectId: account.project_id };
}

async function listFcmTokens(uid, env) {
  const projectId = getenv('FIREBASE_PROJECT_ID', env);
  const apiKey = getenv('FIREBASE_API_KEY', env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/fcmTokens?key=${apiKey}&pageSize=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map((doc) => doc.name.split('/').pop());
}

async function deleteFcmToken(uid, token, env) {
  const projectId = getenv('FIREBASE_PROJECT_ID', env);
  const apiKey = getenv('FIREBASE_API_KEY', env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/fcmTokens/${token}?key=${apiKey}`;
  await fetch(url, { method: 'DELETE' }).catch(() => {});
}

/**
 * Sends a push notification to every device registered for a user.
 * Silently no-ops if FCM isn't configured or the user has no tokens.
 */
export async function sendPushToUid(uid, { title, body, url }, env) {
  if (!uid) return;
  const tokens = await listFcmTokens(uid, env);
  if (!tokens.length) return;

  let auth;
  try {
    auth = await mintAccessToken(env);
  } catch (err) {
    console.error('FCM auth error:', err.message);
    return;
  }

  await Promise.all(tokens.map(async (token) => {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              webpush: { fcmOptions: { link: url || '/' } },
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('UNREGISTERED') || errText.includes('NOT_FOUND') || errText.includes('INVALID_ARGUMENT')) {
          await deleteFcmToken(uid, token, env);
        } else {
          console.error(`FCM send failed for ${uid}:`, errText);
        }
      }
    } catch (err) {
      console.error(`FCM send error for ${uid}:`, err.message);
    }
  }));
}
