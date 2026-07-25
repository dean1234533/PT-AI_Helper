/**
 * GET /api/get-trainer-branding?trainerId={uid}
 * Public endpoint — lets an invited client fetch their trainer's client-portal
 * branding (business name, accent color, logo) without needing a Firestore
 * rule that lets clients read their trainer's profile doc directly.
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
    const trainerId = new URL(ctx.request.url).searchParams.get('trainerId');
    if (!trainerId) return Response.json({ error: 'trainerId is required' }, { status: 400, headers: CORS });

    const doc = await firestoreGet(`users/${trainerId}/data/profile`, env);
    const f = (key) => doc?.fields?.[key]?.stringValue ?? null;

    return Response.json({
      brandName: f('brandName'),
      brandColor: f('brandColor'),
      brandLogoBase64: f('brandLogoBase64'),
    }, { headers: CORS });
  } catch (err) {
    console.error('get-trainer-branding error:', err);
    return Response.json({ error: 'Failed to load branding.' }, { status: 500, headers: CORS });
  }
}
