/**
 * Cloudflare Pages Function — GET /api/get-checkin?id={checkInId}
 * Public endpoint — loads a check-in by its document ID (the token).
 * Uses Firebase REST API with API key.
 *
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
    
  try {
    const id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'id is required' });

    const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/checkIns/${id}?key=${process.env.FIREBASE_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 404) return res.status(404).json({ error: 'Check-in not found or link has expired.' });
    if (!res.ok) throw new Error(`Firestore error: ${res.status}`);

    const doc = await res.json();
    if (!doc.fields) return res.status(404).json({ error: 'Check-in not found.' });

    const f = (key, type = 'stringValue') => doc.fields?.[key]?.[type] ?? null;
    const arr = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => v.stringValue || '') ?? [];
    const arrObj = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => {
      const m = v.mapValue?.fields || {};
      return { question: m.question?.stringValue || '', answer: m.answer?.stringValue || '' };
    }) ?? [];

    return res.status(200).json({
      id,
      clientName: f('clientName'),
      trainerName: f('trainerName'),
      greeting: f('greeting'),
      questions: arr('questions'),
      answers: arrObj('answers'),
      status: f('status'),
    });
  } catch (err) {
    console.error('get-checkin error:', err);
    return res.status(500).json({ error: 'Failed to load check-in.' });
  }
}
