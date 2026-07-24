/**
 * POST /api/complete-invite
 * Public endpoint — called right after a client finishes registering via an
 * invite link. Looks up the pending `clients` doc by inviteToken and links it
 * to the new account. Returns the trainer's identity so the frontend can
 * stamp it onto the new user's own profile doc.
 * Env vars: FIREBASE_PROJECT_ID, FIREBASE_API_KEY
 */

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function getFirestoreCollection(projectId, apiKey, collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?key=${apiKey}&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore fetch failed: ${res.status}`);
  const data = await res.json();
  return data.documents || [];
}

async function patchFirestoreDoc(projectId, apiKey, collection, docId, fields, updateMaskFields) {
  const mask = updateMaskFields.map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}&${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore update failed: ${await res.text()}`);
  return res.json();
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
    const { inviteToken, clientUid } = await ctx.request.json();
    if (!inviteToken || !clientUid) {
      return Response.json({ error: 'inviteToken and clientUid are required' }, { status: 400, headers: CORS });
    }

    const projectId = getenv('FIREBASE_PROJECT_ID', env);
    const apiKey = getenv('FIREBASE_API_KEY', env);
    if (!projectId || !apiKey) {
      return Response.json({ error: 'Firebase REST API is not configured on the server.' }, { status: 500, headers: CORS });
    }

    const clients = await getFirestoreCollection(projectId, apiKey, 'clients');
    const match = clients.find((doc) => {
      const f = doc.fields || {};
      return f.inviteToken?.stringValue === inviteToken && f.status?.stringValue === 'invited';
    });

    if (!match) {
      return Response.json({ error: 'Invite link is invalid or has already been used.' }, { status: 404, headers: CORS });
    }

    const docId = match.name.split('/').pop();
    const f = match.fields || {};
    const trainerId = f.trainerId?.stringValue || '';
    const trainerName = f.trainerName?.stringValue || 'Your trainer';
    const trainerEmail = f.trainerEmail?.stringValue || '';

    await patchFirestoreDoc(
      projectId,
      apiKey,
      'clients',
      docId,
      {
        clientUid: { stringValue: clientUid },
        status: { stringValue: 'active' },
        activatedAt: { timestampValue: new Date().toISOString() },
      },
      ['clientUid', 'status', 'activatedAt']
    );

    return Response.json({ success: true, trainerId, trainerName, trainerEmail }, { headers: CORS });
  } catch (err) {
    console.error('complete-invite error:', err);
    return Response.json({ error: 'Failed to complete invite.' }, { status: 500, headers: CORS });
  }
}
