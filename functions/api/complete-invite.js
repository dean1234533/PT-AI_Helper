/**
 * POST /api/complete-invite
 * Called right after a client registers via an invite link (matched by
 * inviteToken), and also re-tried on every login (matched by email as a
 * fallback) to self-heal any account whose linking failed at signup time —
 * e.g. accounts created before the server-side Firestore auth fix, when this
 * endpoint's writes were silently rejected. Looks up the pending `clients`
 * doc and links it to the account. Returns the trainer's identity so the
 * frontend can stamp it onto the user's own profile doc.
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
    const { inviteToken, email, clientUid } = await ctx.request.json();
    if ((!inviteToken && !email) || !clientUid) {
      return Response.json({ error: 'inviteToken or email, and clientUid, are required' }, { status: 400, headers: CORS });
    }

    const clients = await firestoreList('clients', env);
    const normalizedEmail = email?.trim().toLowerCase();
    const match = clients.find((doc) => {
      const f = doc.fields || {};
      if (f.status?.stringValue !== 'invited') return false;
      if (inviteToken) return f.inviteToken?.stringValue === inviteToken;
      return f.email?.stringValue?.trim().toLowerCase() === normalizedEmail;
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
