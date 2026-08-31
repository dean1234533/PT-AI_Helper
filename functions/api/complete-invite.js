/**
 * POST /api/complete-invite
 * Called right after a client registers via an invite link (matched by
 * inviteToken), and also re-tried on every login (matched by email as a
 * fallback) to self-heal any account whose linking failed at signup time —
 * e.g. accounts created before the server-side Firestore auth fix, when this
 * endpoint's writes were silently rejected. Looks up the pending `clients`
 * doc and links it to the account. Returns the trainer's identity so the
 * frontend can stamp it onto the user's own profile doc.
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON, RESEND_API_KEY, RESEND_FROM_EMAIL
 */

import { firestoreList, firestorePatch } from '../_shared/firestore.js';
import { sendPushToUid } from '../_shared/fcm.js';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSignupEmail({ trainerName, clientName }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:22px;margin:0 0 6px">🎉</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0 0 4px">${escHtml(clientName)} just joined!</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">Signed up using your invite link</p>
  </div>
  <div style="background:white;border-radius:16px;padding:24px;text-align:center">
    <p style="font-size:14px;color:#4b5563;margin:0 0 20px">Hi ${escHtml(trainerName)}, <strong>${escHtml(clientName)}</strong> has completed their signup. Head over to their profile to generate their first plan.</p>
    <div style="background:#eff6ff;border-radius:12px;padding:16px">
      <p style="font-size:14px;color:#2563eb;font-weight:600;margin:0">Log in to view their profile and get started.</p>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">DB's Workouts — Client Signups</p>
</div>
</body></html>`;
}

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
      // Not already linked to a different account. Covers the new invite
      // flow ('invited') and legacy manually-added client records that
      // predate the invite system entirely (no status field at all).
      if (f.status?.stringValue === 'active' || f.clientUid?.stringValue) return false;
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

    const clientName = f.name?.stringValue || 'A client';

    if (trainerId) {
      await sendPushToUid(trainerId, {
        title: `${clientName} joined!`,
        body: `${clientName} signed up using your invite link.`,
        url: '/clients',
      }, env).catch((err) => console.error('Push error:', err.message));
    }

    if (trainerEmail && env.RESEND_API_KEY) {
      const html = buildSignupEmail({ trainerName, clientName });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || "DB's Workouts <onboarding@resend.dev>",
          to: [trainerEmail],
          subject: `${clientName} just joined! 🎉`,
          html,
        }),
      }).catch((err) => console.error('Signup email error:', err.message));
    }

    return Response.json({ success: true, trainerId, trainerName, trainerEmail }, { headers: CORS });
  } catch (err) {
    console.error('complete-invite error:', err);
    return Response.json({ error: 'Failed to complete invite.' }, { status: 500, headers: CORS });
  }
}
