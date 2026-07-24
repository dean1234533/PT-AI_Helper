/**
 * Generic Google service-account OAuth2 token minting for Cloudflare Pages
 * Functions — Web Crypto only, no Node crypto/Admin SDK. Any server-side call
 * that needs to bypass Firestore Security Rules (real backend access, not an
 * end-user request) should authenticate with a token from here rather than a
 * bare API key, which Firestore treats as fully unauthenticated.
 *
 * Env vars: FCM_SERVICE_ACCOUNT_JSON (reused — same service account already
 * has the roles needed for both FCM send and Firestore admin access)
 */

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

function base64UrlEncode(bytes) {
  const str = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
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

const tokenCache = new Map(); // scope -> { accessToken, projectId, expiresAt }

/**
 * Mints (and briefly caches, per-isolate) an OAuth2 access token for the
 * given scope using the service account's private key.
 */
export async function mintAccessToken(env, scope) {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached;

  const raw = getenv('FCM_SERVICE_ACCOUNT_JSON', env);
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON is not configured on the server.');
  const account = JSON.parse(raw);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope,
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
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth2 token exchange failed: ${await res.text()}`);
  const data = await res.json();

  const result = {
    accessToken: data.access_token,
    projectId: account.project_id,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  tokenCache.set(scope, result);
  return result;
}
