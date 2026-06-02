/**
 * Cloudflare Pages Function — GET /api/get-checkin?id={checkInId}
 * Public endpoint — loads a check-in by its document ID (the token).
 * Uses Firebase REST API with API key.
 *
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: corsHeaders });

    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/checkIns/${id}?key=${env.FIREBASE_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 404) return new Response(JSON.stringify({ error: 'Check-in not found or link has expired.' }), { status: 404, headers: corsHeaders });
    if (!res.ok) throw new Error(`Firestore error: ${res.status}`);

    const doc = await res.json();
    if (!doc.fields) return new Response(JSON.stringify({ error: 'Check-in not found.' }), { status: 404, headers: corsHeaders });

    const f = (key, type = 'stringValue') => doc.fields?.[key]?.[type] ?? null;
    const arr = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => v.stringValue || '') ?? [];
    const arrObj = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => {
      const m = v.mapValue?.fields || {};
      return { question: m.question?.stringValue || '', answer: m.answer?.stringValue || '' };
    }) ?? [];

    return new Response(JSON.stringify({
      id,
      clientName: f('clientName'),
      trainerName: f('trainerName'),
      greeting: f('greeting'),
      questions: arr('questions'),
      answers: arrObj('answers'),
      status: f('status'),
    }), { headers: corsHeaders });
  } catch (err) {
    console.error('get-checkin error:', err);
    return new Response(JSON.stringify({ error: 'Failed to load check-in.' }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
