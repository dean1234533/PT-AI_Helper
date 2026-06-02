/**
 * Cloudflare Pages Function — POST /api/checkin-insights
 * Generates AI analysis of a client's check-in answers to help the PT
 * prepare for the video call.
 *
 * Env vars: ANTHROPIC_API_KEY
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

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const { clientName, questions, answers } = await request.json();

    const qa = questions.map((q, i) => `Q: ${q}\nA: ${answers?.[i]?.answer || '(no answer)'}`).join('\n\n');
    const prompt = `Client: ${clientName}\n\nCheck-in responses:\n\n${qa}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: INSIGHTS_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error('Claude API failed');
    const data = await res.json();
    const insights = data.content?.[0]?.text?.trim() || '';

    return new Response(JSON.stringify({ success: true, insights }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
