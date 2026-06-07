/**
 * Cloudflare Pages Function — POST /api/send-checkin
 * Generates AI check-in questions with Claude, then emails the client.
 *
 * Env vars: ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL
 */

const CHECKIN_SYSTEM_PROMPT = `You are a supportive personal trainer assistant. Based on the client's plan and goals, generate a friendly, personalised check-in.

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
- Reference specific details from their plan (e.g. "hitting your protein target of Xg" or "your Monday upper body session")
- If no plan data is available, ask general health and fitness progress questions
- The greeting should feel personal and warm, not templated`;

function buildCheckInPrompt(clientName, planSummary, extraContext) {
  const lines = [`Client name: ${clientName}`, ''];

  if (planSummary) {
    lines.push('=== THEIR PLAN DETAILS ===');
    if (planSummary.goal) lines.push(`Goal: ${planSummary.goal}`);
    if (planSummary.fitnessLevel) lines.push(`Fitness level: ${planSummary.fitnessLevel}`);
    if (planSummary.dietaryStyle) lines.push(`Dietary style: ${planSummary.dietaryStyle}`);
    if (planSummary.dailyCalories) lines.push(`Daily calorie target: ${planSummary.dailyCalories} kcal`);
    if (planSummary.workoutDays) lines.push(`Workout days: ${planSummary.workoutDays}x per week`);
    if (planSummary.keyRules?.length) lines.push(`Key nutrition rules: ${planSummary.keyRules.join('; ')}`);
    lines.push('');
  } else {
    lines.push('No specific plan data available — ask general progress questions.');
    lines.push('');
  }

  if (extraContext) {
    lines.push('=== TRAINER NOTES FOR THIS CHECK-IN ===');
    lines.push(extraContext);
    lines.push('');
  }

  lines.push('Generate the personalised check-in greeting and 6 questions for this client.');
  return lines.join('\n');
}

function buildCheckInEmail({ clientName, trainerName, greeting, questions, checkInUrl }) {
  const questionItems = questions
    .map((q, i) => `<li style="margin-bottom:12px;padding:14px;background:#f9fafb;border-radius:10px;border-left:3px solid #4f46e5;font-size:14px;color:#374151;line-height:1.5"><strong style="color:#4f46e5">${i + 1}.</strong> ${q}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Check-in from ${trainerName}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:24px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);border-radius:20px;padding:32px;margin-bottom:20px;text-align:center">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px">🏋️</div>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px">Check-in from ${trainerName}</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0">Hi ${clientName} — your trainer wants to hear how you're getting on</p>
    </div>

    <!-- Body -->
    <div style="background:white;border-radius:20px;padding:28px;margin-bottom:20px">
      <!-- Greeting -->
      <div style="background:#eef2ff;border-radius:12px;padding:16px;margin-bottom:24px;border-left:4px solid #4f46e5">
        <p style="font-size:15px;color:#3730a3;line-height:1.6;margin:0;font-style:italic">"${greeting}"</p>
        <p style="font-size:13px;color:#6b7280;margin:8px 0 0">— ${trainerName}</p>
      </div>

      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 20px">
        It only takes 5 minutes. Your honest answers help ${trainerName} understand your progress and make the right adjustments to your plan.
      </p>

      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 14px">Your check-in questions:</h2>
      <ol style="padding:0;margin:0 0 24px;list-style:none">${questionItems}</ol>

      <!-- CTA -->
      <div style="text-align:center">
        <a href="${checkInUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.3px">
          Answer My Check-in →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:12px 0 0">Or paste this link: <span style="color:#4f46e5">${checkInUrl}</span></p>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#9ca3af;padding:0 20px">
      This check-in was sent by ${trainerName} via PT AI Helper. Your responses are private and go directly to your trainer.
    </p>
  </div>
</body>
</html>`;
}

function env(name) {
  return process.env[name] || process.env[`VITE_${name}`];
}

async function generateCheckInQuestions(userPrompt) {
  const anthropicKey = env('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API failed: ${claudeRes.status}`);
    const claudeData = await claudeRes.json();
    return claudeData.content?.[0]?.text || '';
  }

  const geminiKey = env('GEMINI_API_KEY');
  if (!geminiKey) {
    throw new Error('AI service is not configured on the server.');
  }

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
  return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
    
  try {
    const { checkInId, clientName, clientEmail, trainerName, trainerEmail, planSummary, extraContext, appUrl } = req.body;
    if (!checkInId || !clientEmail) {
      return res.status(400).json({ error: 'checkInId and clientEmail are required' });
    }

    const userPrompt = buildCheckInPrompt(clientName, planSummary, extraContext);

    const raw = await generateCheckInQuestions(userPrompt);

    let parsed;
    try {
      const match = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
      parsed = JSON.parse(match ? match[1] : raw);
    } catch {
      throw new Error('Failed to parse Claude response');
    }

    const { greeting, questions } = parsed;
    const checkInUrl = `${appUrl || 'https://yourptaihelper.com'}/checkin/${checkInId}`;
    const html = buildCheckInEmail({ clientName, trainerName, greeting, questions, checkInUrl });
    const resendKey = env('RESEND_API_KEY');
    if (!resendKey) {
      return res.status(500).json({ error: 'Email service is not configured on the server.' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env('RESEND_FROM_EMAIL') || 'PT AI Helper <onboarding@resend.dev>',
        to: [clientEmail],
        reply_to: trainerEmail,
        subject: `Quick check-in from ${trainerName} — how are you getting on? 💪`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Email failed: ${err}`);
    }

    return res.status(200).json({ success: true, questions, greeting });
  } catch (err) {
    console.error('send-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
