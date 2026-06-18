/**
 * POST /api/send-checkin
 * Generates personalised check-in questions via AI and emails them to the client.
 * Env vars: GEMINI_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL
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

function buildCheckInPrompt(clientName, planSummary, extraContext) {
  const lines = [`Client name: ${clientName || 'Client'}`, ''];
  if (planSummary) {
    lines.push('=== THEIR PLAN DETAILS ===');
    if (planSummary.goal) lines.push(`Goal: ${planSummary.goal}`);
    if (planSummary.fitnessLevel) lines.push(`Fitness level: ${planSummary.fitnessLevel}`);
    if (planSummary.dailyCalories) lines.push(`Daily calorie target: ${planSummary.dailyCalories} kcal`);
    if (planSummary.workoutDays) lines.push(`Workout days: ${planSummary.workoutDays}x per week`);
    if (planSummary.bodyType) lines.push(`Body type: ${planSummary.bodyType}`);
  }
  if (extraContext) lines.push('', `Extra context: ${extraContext}`);
  lines.push('\nGenerate the personalised check-in greeting and 6 questions for this client.');
  return lines.join('\n');
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
      This check-in was sent by ${trainerName} via DB's AI. Your responses are private and go directly to your trainer.
    </p>
  </div>
</body>
</html>`;
}

async function generateCheckInQuestions(geminiKey, userPrompt) {
  const geminiRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${CHECKIN_SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!geminiRes.ok) throw new Error(`Gemini API failed: ${geminiRes.status}`);
  const geminiData = await geminiRes.json();
  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
  return JSON.parse(match ? match[1] : raw);
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
    const { checkInId, clientName, clientEmail, trainerName, trainerEmail, planSummary, extraContext, appUrl } = await ctx.request.json();

    if (!checkInId || !clientEmail) {
      return Response.json({ error: 'checkInId and clientEmail are required' }, { status: 400, headers: CORS });
    }

    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!geminiKey) return Response.json({ error: 'AI service is not configured on the server.' }, { status: 500, headers: CORS });

    const userPrompt = buildCheckInPrompt(clientName, planSummary, extraContext);
    const { greeting, questions } = await generateCheckInQuestions(geminiKey, userPrompt);

    const base = (appUrl || env.APP_URL || 'https://pt-ai-helper.pages.dev').replace(/\/$/, '');
    const checkInUrl = `${base}/checkin/${checkInId}`;
    const html = buildCheckInEmail({ clientName, trainerName, greeting, questions, checkInUrl });

    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) return Response.json({ error: 'Email service is not configured on the server.' }, { status: 500, headers: CORS });

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "DB's AI <onboarding@resend.dev>",
        to: [clientEmail],
        reply_to: trainerEmail,
        subject: `Quick check-in from ${trainerName} — how are you getting on? 💪`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`Email failed: ${errText}`);
    }

    return Response.json({ success: true, questions, greeting }, { headers: CORS });
  } catch (err) {
    console.error('send-checkin error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
