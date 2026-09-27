/**
 * POST /api/delete-challenge
 * Permanently deletes a challenge and its logs subcollection. Firestore
 * Security Rules never allow deleting a log doc directly (clients could
 * otherwise erase an unwanted below-target entry to fake a streak), so the
 * PT-side "delete" in the UI can only archive via the normal client SDK —
 * this endpoint, authenticated as the service account, is the one place
 * that can actually remove the docs.
 *
 * Body: { challengeId }
 * Header: Authorization: Bearer <trainer's ID token>
 * Env vars: FIREBASE_API_KEY, FIREBASE_PROJECT_ID
 */

import { firestoreGet, firestoreList, firestoreDelete } from '../_shared/firestore.js';

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function verifyCaller(idToken, env) {
  const webApiKey = getenv('FIREBASE_API_KEY', env);
  if (!idToken || !webApiKey) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const account = data.users?.[0];
  if (!account?.localId) return null;
  return { uid: account.localId };
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

    const { challengeId } = await ctx.request.json();
    if (!challengeId) return Response.json({ error: 'challengeId is required' }, { status: 400, headers: CORS });

    const challengeDoc = await firestoreGet(`challenges/${challengeId}`, env);
    if (!challengeDoc) return Response.json({ success: true }, { headers: CORS });

    const ptId = challengeDoc.fields?.ptId?.stringValue;
    if (!ptId || ptId !== caller.uid) {
      return Response.json({ error: 'You are not this challenge\'s trainer.' }, { status: 403, headers: CORS });
    }

    const logs = await firestoreList(`challenges/${challengeId}/logs`, env).catch(() => []);
    await Promise.all(logs.map((doc) => firestoreDelete(doc.name.split('/documents/')[1], env)));
    await firestoreDelete(`challenges/${challengeId}`, env);

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('delete-challenge error:', err);
    return Response.json({ error: err.message || 'Failed to delete challenge.' }, { status: 500, headers: CORS });
  }
}
