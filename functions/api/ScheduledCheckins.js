/**
 * Cloudflare Pages Function — external-cron-driven batch job + manual POST trigger
 * Cloudflare Pages has no native Cron Trigger support for this project, so the
 * daily batch (weekly check-in reminder, self-gated by lastCheckInAt, + daily
 * workout-day push for linked clients) is driven by an external scheduler
 * hitting POST /api/ScheduledCheckins?runAll=true with header
 * X-Cron-Secret: <CRON_SECRET>.
 *
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, GEMINI_API_KEY,
 *           RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL,
 *           FCM_SERVICE_ACCOUNT_JSON, CRON_SECRET
 */

import { sendPushToUid } from '../_shared/fcm.js';
import { firestoreList, firestoreCreateDoc, firestoreGet } from '../_shared/firestore.js';

const CHECKIN_SYSTEM_PROMPT = `You are a supportive personal trainer assistant. Based on the client's plan and goals, generate a friendly, personalised weekly check-in.

Return ONLY valid JSON in this exact format:
{
  "greeting": "A warm, personalised 1-2 sentence opening that references their specific goal",
  "questions": [
    "Question 1 — specific to their plan/goal",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 6"
  ]
}

Rules:
- Generate exactly 6 questions
- Questions must be conversational, not clinical — like a real trainer asking a friend
- Cover: nutrition adherence, workout completion, energy/sleep, biggest challenge, what's working, motivation/mindset
- Reference specific details from their plan where available
- The greeting should feel personal and warm, not templated`;

function generateCheckInId() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

function buildReminderEmail({ clientName, trainerName, checkInUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Weekly check-in reminder</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:20px;padding:32px;margin-bottom:20px;text-align:center">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px">📅</div>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px">Time for your weekly check-in</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0">Hi ${clientName} — ${trainerName} is checking in on your progress</p>
    </div>
    <div style="background:white;border-radius:20px;padding:28px;text-align:center">
      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 24px">Log your weight, energy, and how the week went — it takes just a couple of minutes and helps ${trainerName} fine-tune your plan.</p>
      <a href="${checkInUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.3px">
        Do My Check-in →
      </a>
    </div>
  </div>
</body>
</html>`;
}

async function generateCheckInQuestions(geminiKey, clientName, planSummary) {
  const lines = [`Client name: ${clientName}`, ''];
  if (planSummary) {
    lines.push('=== THEIR PLAN DETAILS ===');
    if (planSummary.goal) lines.push(`Goal: ${planSummary.goal}`);
    if (planSummary.fitnessLevel) lines.push(`Fitness level: ${planSummary.fitnessLevel}`);
    if (planSummary.dailyCalories) lines.push(`Daily calorie target: ${planSummary.dailyCalories} kcal`);
    if (planSummary.workoutDays) lines.push(`Workout days: ${planSummary.workoutDays}x per week`);
    if (planSummary.bodyType) lines.push(`Body type: ${planSummary.bodyType}`);
  }
  lines.push('\nGenerate the personalised check-in greeting and 6 questions for this client.');

  const fullPrompt = `${CHECKIN_SYSTEM_PROMPT}\n\n${lines.join('\n')}`;
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API failed: ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
  return JSON.parse(match ? match[1] : raw);
}

function buildCheckInEmail({ clientName, trainerName, greeting, questions, checkInUrl }) {
  const questionItems = questions
    .map((q, i) => `<li style="margin-bottom:12px;padding:14px;background:#f0f7ff;border-radius:10px;border-left:3px solid #2563eb;font-size:14px;color:#374151;line-height:1.5"><strong style="color:#2563eb">${i + 1}.</strong> ${q}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Weekly Check-in from ${trainerName}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:20px;padding:32px;margin-bottom:20px;text-align:center">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px">🏋️</div>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px">Weekly Check-in</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0">Hi ${clientName} — ${trainerName} wants to hear how your week went</p>
    </div>
    <div style="background:white;border-radius:20px;padding:28px;margin-bottom:20px">
      <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:24px;border-left:4px solid #2563eb">
        <p style="font-size:15px;color:#1d4ed8;line-height:1.6;margin:0;font-style:italic">"${greeting}"</p>
        <p style="font-size:13px;color:#6b7280;margin:8px 0 0">— ${trainerName}</p>
      </div>
      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 20px">Takes just 5 minutes. Your honest answers help ${trainerName} adjust your plan for the best results.</p>
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 14px">This week's check-in:</h2>
      <ol style="padding:0;margin:0 0 24px;list-style:none">${questionItems}</ol>
      <div style="text-align:center">
        <a href="${checkInUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.3px">
          Complete My Check-in →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:12px 0 0">Or paste: <span style="color:#2563eb">${checkInUrl}</span></p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;padding:0 20px">
      Sent by ${trainerName} via DB's Workouts. Your responses go directly to your trainer.
    </p>
  </div>
</body>
</html>`;
}

async function sendCheckInToClient(client, env, { linkOnly = false } = {}) {
  const { name, email, trainerId, trainerName, trainerEmail, planSummary } = client;
  const geminiKey = getenv('GEMINI_API_KEY', env);
  const resendKey = getenv('RESEND_API_KEY', env);

  if (!geminiKey) throw new Error('Gemini API is not configured on the server.');

  const checkInId = generateCheckInId();
  const appUrl = getenv('APP_URL', env) || 'https://pt-ai-helper.pages.dev';
  const checkInUrl = `${appUrl}/#/checkin/${checkInId}`;

  const { greeting, questions } = await generateCheckInQuestions(geminiKey, name, planSummary);

  await firestoreCreateDoc(`checkIns/${checkInId}`, {
    checkInId: { stringValue: checkInId },
    clientName: { stringValue: name },
    clientEmail: { stringValue: email },
    trainerId: { stringValue: trainerId || '' },
    trainerName: { stringValue: trainerName || 'Your Trainer' },
    trainerEmail: { stringValue: trainerEmail || '' },
    greeting: { stringValue: greeting },
    questions: { arrayValue: { values: questions.map(q => ({ stringValue: q })) } },
    status: { stringValue: 'sent' },
    sentAt: { timestampValue: new Date().toISOString() },
    weekNumber: { integerValue: Math.ceil((Date.now() - new Date('2025-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000)) },
  }, env);

  if (linkOnly) return { checkInId, checkInUrl, clientName: name };

  if (!resendKey) throw new Error('Email service is not configured on the server.');
  const html = buildCheckInEmail({ clientName: name, trainerName: trainerName || 'Your Trainer', greeting, questions, checkInUrl });
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: getenv('RESEND_FROM_EMAIL', env) || "DB's Workouts <onboarding@resend.dev>",
      to: [email],
      reply_to: trainerEmail,
      subject: `Your weekly check-in from ${trainerName || 'your trainer'} 💪`,
      html,
    }),
  });

  if (!emailRes.ok) throw new Error(`Email failed for ${email}: ${await emailRes.text()}`);
  return { checkInId, checkInUrl, clientName: name };
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function sendReminderToLinkedClient(client, env) {
  const { name, email, clientUid, trainerName, checkInFrequencyDays } = client;
  const resendKey = getenv('RESEND_API_KEY', env);
  if (!resendKey) throw new Error('Email service is not configured on the server.');

  // Fire a day early relative to the trainer's chosen cadence so a daily cron
  // run reliably catches the due date even with run-time drift.
  const frequencyDays = Math.max(Number(checkInFrequencyDays) || 7, 1);
  const thresholdMs = Math.max(frequencyDays - 1, 1) * DAY_MS;

  const profileDoc = await firestoreGet(`users/${clientUid}/data/profile`, env);
  const lastCheckInAt = profileDoc?.fields?.lastCheckInAt?.stringValue;
  if (lastCheckInAt && Date.now() - new Date(lastCheckInAt).getTime() < thresholdMs) {
    return { skipped: true, clientName: name };
  }

  const appUrl = getenv('APP_URL', env) || 'https://pt-ai-helper.pages.dev';
  const checkInUrl = `${appUrl}/#/checkin`;
  const html = buildReminderEmail({ clientName: name, trainerName: trainerName || 'Your trainer', checkInUrl });

  await sendPushToUid(clientUid, {
    title: 'Time for your weekly check-in',
    body: `${trainerName || 'Your trainer'} wants to know how your week went.`,
    url: '/#/checkin',
  }, env).catch((err) => console.error('Push error:', err.message));

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: getenv('RESEND_FROM_EMAIL', env) || "DB's Workouts <onboarding@resend.dev>",
      to: [email],
      subject: `Time for your weekly check-in, ${name} 💪`,
      html,
    }),
  });

  if (!emailRes.ok) throw new Error(`Email failed for ${email}: ${await emailRes.text()}`);
  return { checkInUrl, clientName: name };
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function findTodaysDay(days) {
  if (!Array.isArray(days) || !days.length) return null;
  const todayIdx = new Date().getDay(); // 0=Sun
  const todayName = DAY_NAMES[todayIdx];

  const match = days.find((d) => (d.dayName || '').toLowerCase().startsWith(todayName.slice(0, 3)));
  if (match) return match;

  const dayNum = todayIdx === 0 ? 7 : todayIdx; // Mon=1 .. Sun=7
  return days.find((d) => d.dayNumber === dayNum) || null;
}

function parseWorkoutDays(profileDoc) {
  const days = profileDoc?.fields?.workoutPlan?.mapValue?.fields?.days?.arrayValue?.values || [];
  return days.map((v) => {
    const f = v.mapValue?.fields || {};
    return {
      dayName: f.dayName?.stringValue || '',
      dayNumber: f.dayNumber?.integerValue ? Number(f.dayNumber.integerValue) : null,
      isRestDay: f.isRestDay?.booleanValue || false,
      focus: f.focus?.stringValue || '',
    };
  });
}

async function sendWorkoutDayPush(clientUid, env) {
  const currentDoc = await firestoreGet(`users/${clientUid}/plans/current`, env);
  if (!currentDoc) return;

  const today = findTodaysDay(parseWorkoutDays(currentDoc));
  if (!today || today.isRestDay) return;

  await sendPushToUid(clientUid, {
    title: 'Workout day!',
    body: today.focus || "Today's session is waiting for you.",
    url: '/#/plan',
  }, env).catch((err) => console.error('Push error:', err.message));
}

async function runScheduledCheckins(env) {
  console.log('Running scheduled check-ins:', new Date().toISOString());

  const clients = await firestoreList('clients', env);

  if (!clients.length) {
    console.log('No clients found');
    return { sent: [], failed: [] };
  }

  const results = { sent: [], failed: [] };

  for (const doc of clients) {
    const f = doc.fields || {};
    const client = {
      name: f.name?.stringValue || 'Client',
      email: f.email?.stringValue,
      clientUid: f.clientUid?.stringValue || null,
      trainerId: f.trainerId?.stringValue,
      trainerName: f.trainerName?.stringValue,
      trainerEmail: f.trainerEmail?.stringValue,
      planSummary: f.planSummary?.mapValue?.fields ? {
        goal: f.planSummary.mapValue.fields.goal?.stringValue,
        fitnessLevel: f.planSummary.mapValue.fields.fitnessLevel?.stringValue,
        dailyCalories: f.planSummary.mapValue.fields.dailyCalories?.integerValue,
        workoutDays: f.planSummary.mapValue.fields.workoutDays?.integerValue,
        bodyType: f.planSummary.mapValue.fields.bodyType?.stringValue,
      } : null,
      autoCheckIn: f.autoCheckIn?.booleanValue !== false,
      checkInFrequencyDays: f.checkInFrequencyDays?.integerValue ? Number(f.checkInFrequencyDays.integerValue) : 7,
    };

    if (client.clientUid) {
      await sendWorkoutDayPush(client.clientUid, env);
    }

    if (!client.email || !client.autoCheckIn) continue;

    try {
      // Clients who registered a linked account get a reminder pointing to their
      // real check-in page instead of the legacy AI-generated Q&A link.
      const result = client.clientUid
        ? await sendReminderToLinkedClient(client, env)
        : await sendCheckInToClient(client, env);
      results.sent.push(result);
      console.log(`Check-in sent to ${client.name} (${client.email})`);
    } catch (err) {
      console.error(`Failed for ${client.email}:`, err.message);
      results.failed.push({ email: client.email, error: err.message });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Done. Sent: ${results.sent.length}, Failed: ${results.failed.length}`);
  return results;
}

// ── Native cron handler — currently dormant. Cloudflare Pages does not invoke
// this for this project (confirmed: no Cron Trigger support exists for Pages
// here). Kept in case that changes; the real trigger today is the ?runAll=true
// POST handler below, driven by an external scheduler. ──
export async function scheduled(event, env) {
  try {
    const results = await runScheduledCheckins(env);
    console.log('Scheduled check-ins complete:', results);
  } catch (err) {
    console.error('Scheduled check-in error:', err);
  }
}

// ── Manual POST trigger / external cron ──────────────────────────────────────
// Cloudflare Pages does not support native Cron Triggers for this project
// (confirmed: wrangler.toml [triggers] is rejected for Pages, and no
// dashboard/API surface exposes one for this project). Point a free external
// scheduler (e.g. cron-job.org) at POST /api/ScheduledCheckins?runAll=true
// once a day, with header X-Cron-Secret: <CRON_SECRET env var>.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Cron-Secret',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const env = ctx.env;
  const url = new URL(ctx.request.url);

  if (url.searchParams.get('runAll') === 'true') {
    const secret = ctx.request.headers.get('X-Cron-Secret') || url.searchParams.get('secret');
    if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
    }
    try {
      const results = await runScheduledCheckins(env);
      return Response.json({ success: true, ...results }, { headers: CORS });
    } catch (err) {
      console.error('runAll error:', err);
      return Response.json({ error: err.message }, { status: 500, headers: CORS });
    }
  }

  try {
    const { clientName, clientEmail, trainerId, trainerName, trainerEmail, planSummary, linkOnly } = await ctx.request.json();
    if (!clientEmail) return Response.json({ error: 'clientEmail required' }, { status: 400, headers: CORS });

    const result = await sendCheckInToClient({
      name: clientName || 'Client',
      email: clientEmail,
      trainerId,
      trainerName,
      trainerEmail,
      planSummary,
    }, env, { linkOnly: !!linkOnly });

    return Response.json({ success: true, ...result }, { headers: CORS });
  } catch (err) {
    console.error('Manual check-in error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
