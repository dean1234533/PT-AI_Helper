/**
 * TEMPORARY — POST /api/cleanup-orphaned-user
 * One-off admin tool to clean up Firestore data left behind under
 * users/{uid}/... after a client's `clients` doc (and possibly their Auth
 * account) was already deleted through the normal flow, before
 * delete-client.js's cleanup covered every subcollection that existed.
 * Restricted to the app's admin account. Delete this file once used.
 *
 * Body: { uid }
 * Header: Authorization: Bearer <admin's ID token>
 * Env vars: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, ADMIN_EMAIL, FCM_SERVICE_ACCOUNT_JSON
 */

import { firestoreDelete, firestoreList, firestoreListCollectionIds } from '../_shared/firestore.js';
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
  return { uid: account.localId, email: account.email || '' };
}

async function deleteAllDocsIn(collectionPath, env) {
  const docs = await firestoreList(collectionPath, env).catch(() => []);
  await Promise.all(docs.map((doc) => firestoreDelete(doc.name.split('/documents/')[1], env)));
  return docs.length;
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

    const adminEmail = getenv('ADMIN_EMAIL', env);
    const isAdmin = adminEmail && caller.email && caller.email.toLowerCase() === adminEmail.toLowerCase();
    if (!isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

    const { uid } = await ctx.request.json();
    if (!uid) return Response.json({ error: 'uid is required' }, { status: 400, headers: CORS });

    // Best-effort: the Auth account may already be gone (that's the whole
    // premise here), so a failure to delete it shouldn't block the sweep.
    try {
      const projectId = getenv('FIREBASE_PROJECT_ID', env);
      const { accessToken } = await mintAccessToken(env, 'https://www.googleapis.com/auth/identitytoolkit');
      await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: uid }),
      });
    } catch { /* ignore */ }

    const collectionIds = await firestoreListCollectionIds(`users/${uid}`, env).catch(() => []);
    const results = {};
    for (const id of collectionIds) {
      results[id] = await deleteAllDocsIn(`users/${uid}/${id}`, env);
    }

    return Response.json({ success: true, uid, collectionsSwept: results }, { headers: CORS });
  } catch (err) {
    console.error('cleanup-orphaned-user error:', err);
    return Response.json({ error: err.message || 'Cleanup failed.' }, { status: 500, headers: CORS });
  }
}
