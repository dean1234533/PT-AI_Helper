// Auto-rotating multi-provider AI handler.
// Tries each provider in priority order; skips any without a key or that fail with quota/rate errors.
// Vision (image) calls always route to Gemini first, then skip non-vision providers.

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
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 } }),
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
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 8192 }),
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
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 8192 }),
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
    buildRequest({ key, prompt, model }) {
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': process.env.APP_URL || 'https://ptaihelper.com', 'X-Title': "DB's AI" },
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
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 8192 }),
        },
        parseResponse: async (res) => { const d = await res.json(); return d?.choices?.[0]?.message?.content || ''; },
        parseError: async (res) => { const d = await res.json().catch(() => ({})); return d?.error?.message || `Mistral ${res.status}`; },
      };
    },
  },
];

function getKey(provider) {
  for (const envKey of provider.envKeys) {
    const val = process.env[envKey];
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, imageBase64 = null, imageMimeType = 'image/jpeg' } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });

  const hasImage = Boolean(imageBase64);
  const allErrors = [];

  for (const provider of PROVIDERS) {
    // Skip non-vision providers when there's an image
    if (hasImage && !provider.supportsVision) continue;

    const key = getKey(provider);
    if (!key) continue; // no key configured for this provider, skip silently

    for (const model of provider.models) {
      try {
        const cfg = provider.buildRequest({ key, prompt, model, imageBase64, imageMimeType });
        const response = await fetch(cfg.url, cfg.options);

        if (!response.ok) {
          const errMsg = await cfg.parseError(response);
          allErrors.push(`${provider.id}/${model}: ${errMsg}`);
          // Hard auth failure — don't try more models for this provider
          if (response.status === 401 || response.status === 403) break;
          if (isRetryableError(response.status, errMsg)) continue;
          break;
        }

        const text = await cfg.parseResponse(response);
        if (text) return res.status(200).json({ text, provider: provider.id, model });

        allErrors.push(`${provider.id}/${model}: empty response`);
      } catch (err) {
        allErrors.push(`${provider.id}/${model}: ${err.message}`);
      }
    }
  }

  return res.status(502).json({
    error: 'All AI providers are currently unavailable. Please try again in a moment.',
    detail: allErrors.join(' | '),
  });
}
