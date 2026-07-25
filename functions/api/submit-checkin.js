/**
 * POST /api/submit-checkin
 * Public endpoint — client submits answers. Updates Firestore, notifies PT via email.
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON, RESEND_API_KEY, RESEND_FROM_EMAIL
 */

import { firestoreGet, firestorePatch } from '../_shared/firestore.js';

function toFirestoreMap(obj) {
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, { stringValue: String(v ?? '') }])
      ),
    },
  };
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildNotificationEmail({ trainerName, clientName, questions, answers }) {
  const qaRows = questions.map((q, i) => {
    const ans = escHtml(answers[i]?.answer || '(no answer)');
    const question = escHtml(String(q));
    return `<div style="margin-bottom:16px;padding:14px;background:#f9fafb;border-radius:10px;border-left:3px solid #4f46e5">
      <p style="font-size:13px;font-weight:700;color:#4f46e5;margin:0 0 6px">${i + 1}. ${question}</p>
      <p style="font-size:14px;color:#374151;margin:0;line-height:1.6">${ans}</p>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:22px;margin:0 0 6px">📬</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0 0 4px">${clientName} has responded</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">Read their answers before scheduling a video call</p>
  </div>
  <div style="background:white;border-radius:16px;padding:24px">
    <p style="font-size:14px;color:#4b5563;margin:0 0 20px">Hi ${trainerName}, your client <strong>${clientName}</strong> has completed their check-in. Here are their answers:</p>
    ${qaRows}
    <div style="margin-top:24px;background:#eef2ff;border-radius:12px;padding:16px;text-align:center">
      <p style="font-size:14px;color:#4338ca;font-weight:600;margin:0">Review their answers and schedule a video call once you're ready.</p>
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
    const { checkInId, answers } = await ctx.request.json();
    if (!checkInId || !answers?.length) {
      return Response.json({ error: 'checkInId and answers are required' }, { status: 400, headers: CORS });
    }

    // 1. Read current check-in to get trainer email + questions
    const currentDoc = await firestoreGet(`checkIns/${checkInId}`, env);
    if (!currentDoc) throw new Error('Check-in not found');
    const f = (key) => currentDoc.fields?.[key]?.stringValue ?? '';
    const questions = currentDoc.fields?.questions?.arrayValue?.values?.map((v) => v.stringValue || '') ?? [];
    const trainerEmail = f('trainerEmail');
    const trainerName = f('trainerName');
    const clientName = f('clientName');

    if (f('status') !== 'sent') {
      return Response.json({ error: 'This check-in has already been answered.' }, { status: 409, headers: CORS });
    }

    // 2. Update Firestore: set answers + status = answered
    await firestorePatch(
      `checkIns/${checkInId}`,
      {
        status: { stringValue: 'answered' },
        answeredAt: { timestampValue: new Date().toISOString() },
        answers: {
          arrayValue: {
            values: answers.map((a) => toFirestoreMap({ question: a.question || '', answer: a.answer || '' })),
          },
        },
      },
      ['status', 'answeredAt', 'answers'],
      env
    );

    // 3. Notify trainer via email
    if (trainerEmail) {
      const resendKey = env.RESEND_API_KEY;
      if (!resendKey) {
        console.warn('Skipping trainer notification because Resend is not configured.');
        return Response.json({ success: true, emailSkipped: true }, { headers: CORS });
      }

      const html = buildNotificationEmail({ trainerName, clientName, questions, answers });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || "DB's Workouts <onboarding@resend.dev>",
          to: [trainerEmail],
          subject: `${clientName} has completed their check-in 📬`,
          html,
        }),
      });
    }

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('submit-checkin error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
