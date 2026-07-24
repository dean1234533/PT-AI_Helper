/**
 * GET /api/get-checkin?id={checkInId}
 * Public endpoint — loads a check-in by its document ID.
 * Env vars: FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON
 */

import { firestoreGet } from '../_shared/firestore.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestGet(ctx) {
  const env = ctx.env;
  try {
    const id = new URL(ctx.request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id is required' }, { status: 400, headers: CORS });

    const doc = await firestoreGet(`checkIns/${id}`, env);
    if (!doc) return Response.json({ error: 'Check-in not found or link has expired.' }, { status: 404, headers: CORS });
    if (!doc.fields) return Response.json({ error: 'Check-in not found.' }, { status: 404, headers: CORS });

    const f = (key, type = 'stringValue') => doc.fields?.[key]?.[type] ?? null;
    const arr = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => v.stringValue || '') ?? [];
    const arrObj = (key) => doc.fields?.[key]?.arrayValue?.values?.map((v) => {
      const m = v.mapValue?.fields || {};
      return { question: m.question?.stringValue || '', answer: m.answer?.stringValue || '' };
    }) ?? [];

    return Response.json({
      id,
      clientName: f('clientName'),
      trainerName: f('trainerName'),
      greeting: f('greeting'),
      questions: arr('questions'),
      answers: arrObj('answers'),
      status: f('status'),
    }, { headers: CORS });
  } catch (err) {
    console.error('get-checkin error:', err);
    return Response.json({ error: 'Failed to load check-in.' }, { status: 500, headers: CORS });
  }
}
