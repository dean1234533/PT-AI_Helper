/**
 * POST /api/complete-invite
 * Public endpoint — called right after a client finishes registering via an
 * invite link. Looks up the pending `clients` doc by inviteToken and links it
 * to the new account. Returns the trainer's identity so the frontend can
 * stamp it onto the new user's own profile doc.
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON
 */

import { firestoreList, firestorePatch } from '../_shared/firestore.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const env = ctx.env;
  try {
    const { inviteToken, clientUid } = await ctx.request.json();
    if (!inviteToken || !clientUid) {
      return Response.json({ error: 'inviteToken and clientUid are required' }, { status: 400, headers: CORS });
    }

    const clients = await firestoreList('clients', env);
    const match = clients.find((doc) => {
      const f = doc.fields || {};
      return f.inviteToken?.stringValue === inviteToken && f.status?.stringValue === 'invited';
    });

    if (!match) {
      return Response.json({ error: 'Invite link is invalid or has already been used.' }, { status: 404, headers: CORS });
    }

    const docId = match.name.split('/').pop();
    const f = match.fields || {};
    const trainerId = f.trainerId?.stringValue || '';
    const trainerName = f.trainerName?.stringValue || 'Your trainer';
    const trainerEmail = f.trainerEmail?.stringValue || '';

    await firestorePatch(
      `clients/${docId}`,
      {
        clientUid: { stringValue: clientUid },
        status: { stringValue: 'active' },
        activatedAt: { timestampValue: new Date().toISOString() },
      },
      ['clientUid', 'status', 'activatedAt'],
      env
    );

    return Response.json({ success: true, trainerId, trainerName, trainerEmail }, { headers: CORS });
  } catch (err) {
    console.error('complete-invite error:', err);
    return Response.json({ error: 'Failed to complete invite.' }, { status: 500, headers: CORS });
  }
}
