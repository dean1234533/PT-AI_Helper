/**
 * POST /api/checkin-insights
 * Generates AI analysis of a client's check-in answers.
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
    const { clientName, questions = [], answers = [] } = await ctx.request.json();

    if (!questions.length || !answers.length) {
      return Response.json({ error: 'questions and answers are required' }, { status: 400, headers: CORS });
    }
    if (questions.length > 10 || answers.length > 10) {
      return Response.json({ error: 'Too many items' }, { status: 400, headers: CORS });
    }

    const safeClientName = String(clientName || 'Client').slice(0, 100);
    const qa = questions.map((q, i) => {
      const question = String(q || '').slice(0, 500);
      const answer = String(answers?.[i]?.answer || '(no answer)').slice(0, 1000);
      return `Q: ${question}\nA: ${answer}`;
    }).join('\n\n');
    const prompt = `Client: ${safeClientName}\n\nCheck-in responses:\n\n${qa}`;
    const fullPrompt = `${INSIGHTS_SYSTEM}\n\n${prompt}`;

    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!geminiKey) return Response.json({ error: 'Gemini API is not configured on the server.' }, { status: 500, headers: CORS });

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini API failed: ${geminiRes.status}`);
    const data = await geminiRes.json();
    const insights = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return Response.json({ success: true, insights }, { headers: CORS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
