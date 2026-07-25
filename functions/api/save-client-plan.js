/**
 * POST /api/save-client-plan
 * Lets a trainer save a generated analysis/plan into one of their linked
 * client's Firestore docs. Trainers only have Firestore *read* access to a
 * client's data (intentional — see firestore.rules), so this endpoint does
 * the write server-side after verifying, via the caller's own Firebase ID
 * token, that they're actually that client's trainer.
 *
 * Body: { clientUid, analysis?, plan? } — at least one of analysis/plan required.
 * Header: Authorization: Bearer <trainer's ID token>
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON
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

    const { clientUid, analysis, plan } = await ctx.request.json();
    if (!clientUid || (!analysis && !plan)) {
      return Response.json({ error: 'clientUid and at least one of analysis/plan are required' }, { status: 400, headers: CORS });
    }

    const clientProfile = await firestoreGet(`users/${clientUid}/data/profile`, env);
    const trainerId = clientProfile?.fields?.trainerId?.stringValue;
    if (!trainerId || trainerId !== caller.uid) {
      return Response.json({ error: 'You are not this client\'s trainer.' }, { status: 403, headers: CORS });
    }

    if (analysis) {
      const analysisFields = { ...analysis, generatedAt: new Date().toISOString() };
      await firestorePatch(
        `users/${clientUid}/data/analysis`,
        toFirestoreFields(analysisFields),
        Object.keys(analysisFields),
        env
      );
    }

    // Partial saves (workout-only or nutrition-only) must only touch the
    // top-level fields being written — a full-document replace here would
    // silently wipe out whichever half of the plan wasn't just regenerated.
    if (plan) {
      const planFields = { ...plan, generatedAt: new Date().toISOString(), weekNumber: plan.weekNumber || 1 };
      await firestorePatch(
        `users/${clientUid}/plans/current`,
        toFirestoreFields(planFields),
        Object.keys(planFields),
        env
      );
    }

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('save-client-plan error:', err);
    return Response.json({ error: err.message || 'Failed to save plan.' }, { status: 500, headers: CORS });
  }
}
