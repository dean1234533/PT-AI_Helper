/**
 * POST /api/resolve-meal-request
 * Lets a trainer mark a client's meal-change request as resolved. Trainers
 * only have Firestore *read* access to a linked client's data (see
 * firestore.rules), so this write happens server-side after verifying, via
 * the caller's own Firebase ID token, that they're actually that client's
 * trainer.
 *
 * Body: { clientUid, requestId }
 * Header: Authorization: Bearer <trainer's ID token>
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FCM_SERVICE_ACCOUNT_JSON
 */

import { firestoreGet, firestorePatch, toFirestoreFields } from '../_shared/firestore.js';

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

    const { clientUid, requestId } = await ctx.request.json();
    if (!clientUid || !requestId) {
      return Response.json({ error: 'clientUid and requestId are required' }, { status: 400, headers: CORS });
    }

    const clientProfile = await firestoreGet(`users/${clientUid}/data/profile`, env);
    const trainerId = clientProfile?.fields?.trainerId?.stringValue;
    if (!trainerId || trainerId !== caller.uid) {
      return Response.json({ error: 'You are not this client\'s trainer.' }, { status: 403, headers: CORS });
    }

    const fields = { status: 'resolved', resolvedAt: new Date().toISOString() };
    await firestorePatch(
      `users/${clientUid}/mealRequests/${requestId}`,
      toFirestoreFields(fields),
      Object.keys(fields),
      env
    );

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('resolve-meal-request error:', err);
    return Response.json({ error: err.message || 'Failed to resolve request.' }, { status: 500, headers: CORS });
  }
}
