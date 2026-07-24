/**
 * Firestore REST helpers authenticated as the service account (via
 * gcp-auth.js), not a bare API key. Firestore Security Rules treat a plain
 * `?key=` REST call as fully unauthenticated (request.auth == null) — a
 * service-account OAuth2 token is real IAM-level access and bypasses
 * Security Rules entirely, same as the Admin SDK does. Use these for any
 * backend automation that isn't acting on behalf of a signed-in end user.
 */

import { mintAccessToken } from './gcp-auth.js';

const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function base(env) {
  const { accessToken, projectId } = await mintAccessToken(env, DATASTORE_SCOPE);
  const fbProjectId = getenv('FIREBASE_PROJECT_ID', env) || projectId;
  return {
    headers: { Authorization: `Bearer ${accessToken}` },
    url: `https://firestore.googleapis.com/v1/projects/${fbProjectId}/databases/(default)/documents`,
  };
}

export async function firestoreGet(path, env) {
  const { headers, url } = await base(env);
  const res = await fetch(`${url}/${path}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function firestoreList(collection, env, pageSize = 100) {
  const { headers, url } = await base(env);
  const res = await fetch(`${url}/${collection}?pageSize=${pageSize}`, { headers });
  if (!res.ok) throw new Error(`Firestore list ${collection} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.documents || [];
}

export async function firestoreCreateDoc(path, fields, env) {
  const { headers, url } = await base(env);
  const res = await fetch(`${url}/${path}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore write ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function firestorePatch(path, fields, updateMaskFields, env) {
  const { headers, url } = await base(env);
  const mask = updateMaskFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const res = await fetch(`${url}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore update ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function firestoreDelete(path, env) {
  const { headers, url } = await base(env);
  await fetch(`${url}/${path}`, { method: 'DELETE', headers }).catch(() => {});
}
