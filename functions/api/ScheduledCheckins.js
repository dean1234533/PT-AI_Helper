/**
 * Cloudflare Pages Function — Scheduled Cron
 * Runs every Monday at 8:00 AM UTC
 * Sends weekly check-in emails to all active clients
 *
 * Cron schedule: 0 8 * * 1
 *
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, ANTHROPIC_API_KEY,
 *           RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL
 */

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
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function getFirestoreCollection(projectId, apiKey, collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?key=${apiKey}&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore fetch failed: ${res.status}`);
  const data = await res.json();
  return data.documents || [];
}

async function createFirestoreDoc(projectId, apiKey, collection, docId, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status}`);
  return res.json();
}

async function generateCheckInQuestions(anthropicKey, clientName, planSummary) {
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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: CHECKIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: lines.join('\n') }],
    }),
  });

  if (!res.ok) throw new Error('Claude API failed');
  const data = await res.json();
  const raw = data.content?.[0]?.text || '';
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
      Sent by ${trainerName} via PT AI Helper. Your responses go directly to your trainer.
    </p>
  </div>
</body>
</html>`;
}

async function sendCheckInToClient(env, client) {
  const { name, email, trainerId, trainerName, trainerEmail, planSummary } = client;
  const checkInId = generateCheckInId();
  const appUrl = env.APP_URL || 'https://pt-ai-helper.vercel.app';
  const checkInUrl = `${appUrl}/checkin/${checkInId}`;

  // Generate AI questions
  const { greeting, questions } = await generateCheckInQuestions(env.ANTHROPIC_API_KEY, name, planSummary);

  // Save check-in doc to Firestore
  await createFirestoreDoc(env.FIREBASE_PROJECT_ID, env.FIREBASE_API_KEY, 'checkIns', checkInId, {
    checkInId: { stringValue: checkInId },
    clientName: { stringValue: name },
    clientEmail: { stringValue: email },
    trainerId: { stringValue: trainerId },
    trainerName: { stringValue: trainerName || 'Your Trainer' },
    trainerEmail: { stringValue: trainerEmail || '' },
    greeting: { stringValue: greeting },
    questions: { arrayValue: { values: questions.map(q => ({ stringValue: q })) } },
    status: { stringValue: 'sent' },
    sentAt: { timestampValue: new Date().toISOString() },
    weekNumber: { integerValue: Math.ceil((Date.now() - new Date('2025-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000)) },
  });

  // Send email
  const html = buildCheckInEmail({ clientName: name, trainerName: trainerName || 'Your Trainer', greeting, questions, checkInUrl });
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'PT AI Helper <onboarding@resend.dev>',
      to: [email],
      reply_to: trainerEmail,
      subject: `Your weekly check-in from ${trainerName || 'your trainer'} 💪`,
      html,
    }),
  });

  if (!emailRes.ok) throw new Error(`Email failed for ${email}: ${await emailRes.text()}`);
  return { checkInId, clientName: name };
}

// ── Scheduled handler (Cloudflare Cron) ──────────────────────────────────────
export async function scheduled(event, env, ctx) {
  console.log('Running scheduled check-ins:', new Date().toISOString());

  try {
    const clients = await getFirestoreCollection(env.FIREBASE_PROJECT_ID, env.FIREBASE_API_KEY, 'clients');
    if (!clients.length) { console.log('No clients found'); return; }

    const results = { sent: [], failed: [] };

    for (const doc of clients) {
      const f = doc.fields || {};
      const client = {
        name: f.name?.stringValue || 'Client',
        email: f.email?.stringValue,
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
        autoCheckIn: f.autoCheckIn?.booleanValue !== false, // default true
      };

      if (!client.email || !client.autoCheckIn) continue;

      try {
        const result = await sendCheckInToClient(env, client);
        results.sent.push(result);
        console.log(`Check-in sent to ${client.name} (${client.email})`);
      } catch (err) {
        console.error(`Failed for ${client.email}:`, err.message);
        results.failed.push({ email: client.email, error: err.message });
      }

      // Stagger sends to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Done. Sent: ${results.sent.length}, Failed: ${results.failed.length}`);
  } catch (err) {
    console.error('Scheduled check-in error:', err);
  }
}

// ── HTTP handler — manual trigger from dashboard ──────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const { clientId, clientName, clientEmail, trainerId, trainerName, trainerEmail, planSummary } = await request.json();
    if (!clientEmail) return new Response(JSON.stringify({ error: 'clientEmail required' }), { status: 400, headers: corsHeaders });

    const result = await sendCheckInToClient(env, {
      name: clientName || 'Client',
      email: clientEmail,
      trainerId,
      trainerName,
      trainerEmail,
      planSummary,
    });

    return new Response(JSON.stringify({ success: true, ...result }), { headers: corsHeaders });
  } catch (err) {
    console.error('Manual check-in error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}