/**
 * POST /api/notify-trainer-mealrequest
 * Emails (and pushes to) a trainer when one of their linked clients suggests
 * a change to a meal in their nutrition plan.
 * Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL, FCM_SERVICE_ACCOUNT_JSON
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

function buildEmail({ trainerName, clientName, dayName, mealName, message }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#065f46,#059669);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:22px;margin:0 0 6px">🍽️</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0 0 4px">${escHtml(clientName)} suggested a meal change</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">${escHtml(dayName || '')}${dayName && mealName ? ' — ' : ''}${escHtml(mealName || '')}</p>
  </div>
  <div style="background:white;border-radius:16px;padding:24px">
    <p style="font-size:14px;color:#4b5563;margin:0 0 16px">Hi ${escHtml(trainerName)}, your client <strong>${escHtml(clientName)}</strong> left a note on their plan:</p>
    <div style="padding:12px 14px;background:#f0fdf4;border-radius:10px;border-left:3px solid #059669">
      <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;white-space:pre-wrap">${escHtml(message)}</p>
    </div>
    <div style="margin-top:24px;background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
      <p style="font-size:14px;color:#059669;font-weight:600;margin:0">Log in to review and update their nutrition plan.</p>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">DB's Workouts — Meal Change Requests</p>
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
    const { trainerId, trainerEmail, trainerName, clientName, dayName, mealName, message } = await ctx.request.json();
    if (!clientName || !message) {
      return Response.json({ error: 'clientName and message are required' }, { status: 400, headers: CORS });
    }

    if (trainerId) {
      await sendPushToUid(trainerId, {
        title: `${clientName} suggested a meal change`,
        body: message.length > 100 ? `${message.slice(0, 100)}…` : message,
        url: '/clients',
      }, env).catch((err) => console.error('Push error:', err.message));
    }

    const resendKey = env.RESEND_API_KEY;
    if (!resendKey || !trainerEmail) return Response.json({ success: true, emailSkipped: true }, { headers: CORS });

    const html = buildEmail({ trainerName: trainerName || 'Coach', clientName, dayName, mealName, message });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "DB's Workouts <onboarding@resend.dev>",
        to: [trainerEmail],
        subject: `${clientName} suggested a meal change 🍽️`,
        html,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return Response.json({ error: 'Email send failed' }, { status: 502, headers: CORS });
    }

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('notify-trainer-mealrequest error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
