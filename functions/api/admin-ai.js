// Auto-rotating multi-provider AI handler for Cloudflare Pages Functions.
// Tries each provider in priority order; skips any without a key or that fail with quota/rate errors.

import { firestoreGet } from '../_shared/firestore.js';

const PROVIDERS = [
  {
    id: 'gemini',
    envKeys: ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'],
    supportsVision: true,
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
    buildRequest({ key, prompt, model, imageBase64, imageMimeType }) {
      const parts = [];
      if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
      parts.push({ text: prompt });
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 65536 } }),
        },
        parseResponse: async (res) => { const d = await res.json(); return d?.candidates?.[0]?.content?.parts?.[0]?.text || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || `Gemini ${res.status}`; },
      };
    },
  },
  {
    id: 'groq',
    envKeys: ['GROQ_API_KEY'],
    supportsVision: false,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    buildRequest({ key, prompt, model }) {
      return {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 32768 }),
        },
        parseResponse: async (res) => { const d = await res.json(); return d?.choices?.[0]?.message?.content || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || `Groq ${res.status}`; },
      };
    },
  },
  {
    id: 'cerebras',
    envKeys: ['CEREBRAS_API_KEY'],
    supportsVision: false,
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    buildRequest({ key, prompt, model }) {
      return {
        url: 'https://api.cerebras.ai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Accept: 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 16384 }),
        },
        parseResponse: async (res) => { const d = await res.json(); return d?.choices?.[0]?.message?.content || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || d?.message || `Cerebras ${res.status}`; },
      };
    },
  },
  {
    id: 'openrouter',
    envKeys: ['OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'],
    supportsVision: false,
    models: ['deepseek/deepseek-chat-v3.2:free', 'qwen/qwen3-coder:free', 'z-ai/glm-4.7:free', 'openrouter/free'],
    buildRequest({ key, prompt, model, appUrl }) {
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': appUrl || 'https://app.dbworkouts.co.uk', 'X-Title': "DB's AI" },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 }),
        },
        parseResponse: async (res) => { const d = await res.json(); if (d?.error) return ''; return d?.choices?.[0]?.message?.content || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || d?.message || `OpenRouter ${res.status}`; },
      };
    },
  },
  {
    id: 'mistral',
    envKeys: ['MISTRAL_API_KEY'],
    supportsVision: false,
    models: ['mistral-small-latest', 'open-mistral-7b'],
    buildRequest({ key, prompt, model }) {
      return {
        url: 'https://api.mistral.ai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 32768 }),
        },
        parseResponse: async (res) => { const d = await res.json(); return d?.choices?.[0]?.message?.content || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || `Mistral ${res.status}`; },
      };
    },
  },
];

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function verifyCaller(idToken, env) {
  const webApiKey = getenv('FIREBASE_API_KEY', env);
  if (!idToken || !webApiKey) return null;

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!lookupRes.ok) return null;
  const lookupData = await lookupRes.json();
  const account = lookupData.users?.[0];
  if (!account?.localId) return null;
  return { uid: account.localId, email: account.email || '' };
}

async function isLinkedClient(uid, env) {
  const doc = await firestoreGet(`users/${uid}/data/profile`, env).catch(() => null);
  if (!doc) return false;
  return Boolean(doc.fields?.trainerId?.stringValue);
}

function getKey(provider, env) {
  for (const envKey of provider.envKeys) {
    const val = env[envKey];
    if (val) return val;
  }
  return null;
}

function isRetryableError(status, message = '') {
  if ([429, 402, 503, 529, 400, 404].includes(status)) return true;
  const lower = message.toLowerCase();
  return lower.includes('quota') || lower.includes('credit') || lower.includes('rate limit') ||
    lower.includes('exhausted') || lower.includes('unavailable') || lower.includes('not found') ||
    lower.includes('model') || lower.includes('insufficient');
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

  const authHeader = ctx.request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const caller = await verifyCaller(idToken, env);
  if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const adminEmail = getenv('ADMIN_EMAIL', env);
  const isAdmin = adminEmail && caller.email && caller.email.toLowerCase() === adminEmail.toLowerCase();
  if (!isAdmin && !(await isLinkedClient(caller.uid, env))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
  }

  let body;
  try { body = await ctx.request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { prompt, imageBase64 = null, imageMimeType = 'image/jpeg' } = body || {};
  if (!prompt?.trim()) return Response.json({ error: 'prompt is required' }, { status: 400, headers: CORS });
  if (imageBase64 && imageBase64.length > 1_000_000) {
    return Response.json({ error: 'Image too large (max ~750 KB)' }, { status: 413, headers: CORS });
  }

  const hasImage = Boolean(imageBase64);
  const allErrors = [];
  const appUrl = env.APP_URL || 'https://app.dbworkouts.co.uk';

  for (const provider of PROVIDERS) {
    if (hasImage && !provider.supportsVision) continue;

    const key = getKey(provider, env);
    if (!key) continue;

    for (const model of provider.models) {
      try {
        const cfg = provider.buildRequest({ key, prompt, model, imageBase64, imageMimeType, appUrl });
        const response = await fetch(cfg.url, cfg.options);

        if (!response.ok) {
          const errMsg = await cfg.parseError(response);
          allErrors.push(`${provider.id}/${model}: ${errMsg}`);
          if (response.status === 401 || response.status === 403) break;
          if (isRetryableError(response.status, errMsg)) continue;
          break;
        }

        const text = await cfg.parseResponse(response);
        if (text) return Response.json({ text, provider: provider.id, model }, { headers: CORS });

        allErrors.push(`${provider.id}/${model}: empty response`);
      } catch (err) {
        allErrors.push(`${provider.id}/${model}: ${err.message}`);
      }
    }
  }

  return Response.json({
    error: 'All AI providers are currently unavailable. Please try again in a moment.',
    detail: allErrors.join(' | '),
  }, { status: 502, headers: CORS });
}
