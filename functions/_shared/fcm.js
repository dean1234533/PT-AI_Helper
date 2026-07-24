/**
 * Shared helper for sending Firebase Cloud Messaging push notifications from
 * Cloudflare Pages Functions.
 *
 * Env vars: FCM_SERVICE_ACCOUNT_JSON, FIREBASE_PROJECT_ID
 */

import { mintAccessToken } from './gcp-auth.js';
import { firestoreList, firestoreDelete } from './firestore.js';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

async function listFcmTokens(uid, env) {
  const docs = await firestoreList(`users/${uid}/fcmTokens`, env, 20).catch(() => []);
  return docs.map((doc) => doc.name.split('/').pop());
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
    auth = await mintAccessToken(env, FCM_SCOPE);
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
          await firestoreDelete(`users/${uid}/fcmTokens/${token}`, env);
        } else {
          console.error(`FCM send failed for ${uid}:`, errText);
        }
      }
    } catch (err) {
      console.error(`FCM send error for ${uid}:`, err.message);
    }
  }));
}
