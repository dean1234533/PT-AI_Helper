/**
 * POST /api/delete-client
 * Permanently deletes an invited client: their Firebase Auth account, every
 * Firestore doc under users/{clientUid}/..., and the clients record linking
 * them to the trainer. Irreversible — the frontend requires the trainer to
 * type the client's name to confirm before calling this.
 *
 * Body: { clientUid, clientDocId }
 * Header: Authorization: Bearer <trainer's ID token>
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON
 */

import { firestoreGet, firestoreList, firestoreDelete } from '../_shared/firestore.js';
import { mintAccessToken } from '../_shared/gcp-auth.js';

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function verifyCaller(idToken, env) {
  const webApiKey = getenv('FIREBASE_API_KEY', env);
  if (!idToken || !webApiKey) return null;

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!lookupRes.ok) return null;
  const lookupData = await lookupRes.json();
  const account = lookupData.users?.[0];
  if (!account?.localId) return null;
  return { uid: account.localId };
}

async function deleteAuthAccount(clientUid, env) {
  const projectId = getenv('FIREBASE_PROJECT_ID', env);
  const { accessToken } = await mintAccessToken(env, 'https://www.googleapis.com/auth/identitytoolkit');
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: clientUid }),
  });
  // Not finding the auth user (already deleted) shouldn't block cleanup of the rest.
  if (!res.ok && res.status !== 400 && res.status !== 404) {
    throw new Error(`Failed to delete auth account: ${await res.text()}`);
  }
}

async function deleteAllDocsIn(collectionPath, env) {
  const docs = await firestoreList(collectionPath, env).catch(() => []);
  await Promise.all(docs.map((doc) => firestoreDelete(doc.name.split('/documents/')[1], env)));
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const env = ctx.env;
  try {
    const authHeader = ctx.request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const caller = await verifyCaller(idToken, env);
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

    const { clientUid, clientDocId } = await ctx.request.json();
    if (!clientDocId) {
      return Response.json({ error: 'clientDocId is required' }, { status: 400, headers: CORS });
    }

    // Ownership is checked against the clients record itself (not the client's
    // own profile) since a not-yet-signed-up invite has no linked account/profile.
    const clientDoc = await firestoreGet(`clients/${clientDocId}`, env);
    const trainerId = clientDoc?.fields?.trainerId?.stringValue;
    if (!trainerId || trainerId !== caller.uid) {
      return Response.json({ error: 'You are not this client\'s trainer.' }, { status: 403, headers: CORS });
    }

    if (clientUid) {
      await deleteAuthAccount(clientUid, env);
      await Promise.all([
        deleteAllDocsIn(`users/${clientUid}/checkins`, env),
        deleteAllDocsIn(`users/${clientUid}/fcmTokens`, env),
        deleteAllDocsIn(`users/${clientUid}/plans`, env),
        firestoreDelete(`users/${clientUid}/data/profile`, env),
        firestoreDelete(`users/${clientUid}/data/analysis`, env),
      ]);
    }

    await firestoreDelete(`clients/${clientDocId}`, env);

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('delete-client error:', err);
    return Response.json({ error: err.message || 'Failed to delete client.' }, { status: 500, headers: CORS });
  }
}
