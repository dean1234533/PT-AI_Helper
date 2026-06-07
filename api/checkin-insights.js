/**
 * Cloudflare Pages Function — POST /api/checkin-insights
 * Generates AI analysis of a client's check-in answers to help the PT
 * prepare for the video call.
 *
 * Env vars: GEMINI_API_KEY
 */

const INSIGHTS_SYSTEM = `You are an expert personal trainer reviewing a client's check-in responses.

Analyse their answers and provide a concise, structured summary for the trainer to read before the video call.

Format your response in plain text (no markdown headings, no bullet points — just clear paragraphs) covering:
1. Overall client status and wellbeing (1-2 sentences)
2. Key wins — what's going well
3. Key concerns — struggles, barriers, or red flags
4. Recommended talking points for the video call
5. Any plan adjustments worth discussing

Keep it under 250 words. Be direct and practical — this is a prep note for the trainer, not a report for the client.`;

function env(name) {
  return process.env[name] || process.env[`VITE_${name}`];
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
    const { clientName, questions = [], answers = [] } = req.body || {};

    if (!questions.length || !answers.length) {
      return res.status(400).json({ error: 'questions and answers are required' });
    }

    const qa = questions.map((q, i) => `Q: ${q}\nA: ${answers?.[i]?.answer || '(no answer)'}`).join('\n\n');
    const prompt = `Client: ${clientName}\n\nCheck-in responses:\n\n${qa}`;

    const fullPrompt = `${INSIGHTS_SYSTEM}\n\n${prompt}`;
    const geminiKey = env('GEMINI_API_KEY');
    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API is not configured on the server.' });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini API failed: ${geminiRes.status}`);
    const data = await geminiRes.json();
    const insights = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return res.status(200).json({ success: true, insights });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
