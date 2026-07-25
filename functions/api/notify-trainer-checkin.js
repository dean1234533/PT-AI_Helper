/**
 * POST /api/notify-trainer-checkin
 * Emails (and pushes to) a trainer when one of their linked clients submits a
 * structured weekly check-in (weight/energy/mood/adherence/notes).
 * Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FCM_SERVICE_ACCOUNT_JSON
 */

import { sendPushToUid } from '../_shared/fcm.js';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function row(label, value) {
  if (value === undefined || value === null || value === '') return '';
  return `<div style="margin-bottom:12px;padding:12px 14px;background:#f9fafb;border-radius:10px;border-left:3px solid #4f46e5">
    <p style="font-size:11px;font-weight:700;color:#4f46e5;margin:0 0 4px;text-transform:uppercase">${label}</p>
    <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;white-space:pre-wrap">${escHtml(value)}</p>
  </div>`;
}

function buildEmail({ trainerName, clientName, checkinData }) {
  const c = checkinData || {};
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:22px;margin:0 0 6px">📬</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0 0 4px">${escHtml(clientName)} has checked in</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">Weekly progress update</p>
  </div>
  <div style="background:white;border-radius:16px;padding:24px">
    <p style="font-size:14px;color:#4b5563;margin:0 0 20px">Hi ${escHtml(trainerName)}, your client <strong>${escHtml(clientName)}</strong> has submitted their weekly check-in:</p>
    ${row('Weight', c.weight != null ? `${c.weight} kg` : '')}
    ${row('Energy (1-10)', c.energy)}
    ${row('Mood (1-10)', c.mood)}
    ${row('Workout adherence', c.adherenceWorkout)}
    ${row('Nutrition adherence', c.adherenceNutrition)}
    ${row('What went well', c.notesWell)}
    ${row('Challenges', c.notesChallenging)}
    <div style="margin-top:24px;background:#eef2ff;border-radius:12px;padding:16px;text-align:center">
      <p style="font-size:14px;color:#4338ca;font-weight:600;margin:0">Log in to review their full history and progress photo.</p>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">DB's Workouts — Check-in System</p>
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
    const { trainerId, trainerEmail, trainerName, clientName, checkinData } = await ctx.request.json();
    if (!trainerEmail || !clientName) {
      return Response.json({ error: 'trainerEmail and clientName are required' }, { status: 400, headers: CORS });
    }

    if (trainerId) {
      await sendPushToUid(trainerId, {
        title: `${clientName} checked in`,
        body: `Weight: ${checkinData?.weight ?? '—'} kg · Energy ${checkinData?.energy ?? '—'}/10 · Mood ${checkinData?.mood ?? '—'}/10`,
        url: '/#/clients',
      }, env).catch((err) => console.error('Push error:', err.message));
    }

    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) return Response.json({ success: true, emailSkipped: true }, { headers: CORS });

    const html = buildEmail({ trainerName: trainerName || 'Coach', clientName, checkinData });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "DB's Workouts <onboarding@resend.dev>",
        to: [trainerEmail],
        subject: `${clientName} has checked in 📬`,
        html,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return Response.json({ error: 'Email send failed' }, { status: 502, headers: CORS });
    }

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('notify-trainer-checkin error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
