/**
 * TEMPORARY — POST /api/cleanup-orphaned-user
 * One-off admin tool to clean up Firestore data left behind after a client
 * was deleted through the normal flow before it covered everything: sweeps
 * every subcollection under users/{uid}, AND separately searches the two
 * TOP-LEVEL collections that delete-client.js never touches at all —
 * `clients` (in case a doc matching this email still exists, e.g. a
 * duplicate/legacy record with a different id than the one that got
 * deleted) and `checkIns` (the pre-invite-system check-in records, keyed by
 * clientEmail, from before per-user users/{uid}/checkins subcollections
 * existed) — deleting any match by email.
 * Restricted to the app's admin account. Delete this file once used.
 *
 * Body: { uid?, email? } — at least one required.
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

// Lists every doc in a top-level collection and deletes the ones whose given
// field matches the target email, returning what was found for reporting.
async function findAndDeleteByEmail(collection, fieldName, email, env) {
  const docs = await firestoreList(collection, env, 300).catch(() => []);
  const matches = docs.filter((doc) => doc.fields?.[fieldName]?.stringValue?.toLowerCase() === email.toLowerCase());
  await Promise.all(matches.map((doc) => firestoreDelete(doc.name.split('/documents/')[1], env)));
  return matches.map((doc) => ({ id: doc.name.split('/').pop(), fields: Object.fromEntries(
    Object.entries(doc.fields || {}).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? v.booleanValue ?? '[complex]'])
  ) }));
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

    const { uid, email } = await ctx.request.json();
    if (!uid && !email) return Response.json({ error: 'uid or email is required' }, { status: 400, headers: CORS });

    const results = { collectionsSwept: {}, clientsMatched: [], checkInsMatched: [] };

    if (uid) {
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
      for (const id of collectionIds) {
        results.collectionsSwept[id] = await deleteAllDocsIn(`users/${uid}/${id}`, env);
      }
    }

    if (email) {
      results.clientsMatched = await findAndDeleteByEmail('clients', 'email', email, env);
      results.checkInsMatched = await findAndDeleteByEmail('checkIns', 'clientEmail', email, env);
    }

    return Response.json({ success: true, uid: uid || null, email: email || null, ...results }, { headers: CORS });
  } catch (err) {
    console.error('cleanup-orphaned-user error:', err);
    return Response.json({ error: err.message || 'Cleanup failed.' }, { status: 500, headers: CORS });
  }
}
