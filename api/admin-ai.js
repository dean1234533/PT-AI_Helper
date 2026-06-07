const PROVIDER_CONFIGS = {
  gemini: {
    envKey: 'GEMINI_API_KEY',
    buildRequest: ({ key, prompt, model, imageBase64, imageMimeType }) => {
      const parts = [];
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType || 'image/jpeg',
            data: imageBase64,
          },
        });
      }
      parts.push({ text: prompt });

      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        },
        parseResponse: async (response) => {
          const data = await response.json();
          return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        },
        parseError: async (response) => {
          const data = await response.json().catch(() => ({}));
          return data?.error?.message || `Gemini error ${response.status}`;
        },
      };
    },
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    buildRequest: ({ key, prompt, model }) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      },
      parseResponse: async (response) => {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      },
      parseError: async (response) => {
        const data = await response.json().catch(() => ({}));
        return data?.error?.message || `Groq error ${response.status}`;
      },
    }),
  },
  cerebras: {
    envKey: 'CEREBRAS_API_KEY',
    buildRequest: ({ key, prompt, model }) => ({
      url: 'https://api.cerebras.ai/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      },
      parseResponse: async (response) => {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      },
      parseError: async (response) => {
        const data = await response.json().catch(() => ({}));
        return data?.error?.message || data?.message || `Cerebras error ${response.status}`;
      },
    }),
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    fallbackEnvKeys: ['VITE_OPENROUTER_API_KEY'],
    buildRequest: ({ key, prompt, model }) => ({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': process.env.APP_URL || 'https://pt-ai-helper.vercel.app',
          'X-Title': 'PT AI Helper',
        },
        body: JSON.stringify({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      },
      parseResponse: async (response) => {
        const data = await response.json();
        // OpenRouter returns 200 with error body when model has no endpoints
        if (data?.error) return '';
        return data?.choices?.[0]?.message?.content || '';
      },
      parseError: async (response) => {
        const data = await response.json().catch(() => ({}));
        return data?.error?.message || data?.message || `OpenRouter error ${response.status}`;
      },
    }),
  },
  mistral: {
    envKey: 'MISTRAL_API_KEY',
    buildRequest: ({ key, prompt, model }) => ({
      url: 'https://api.mistral.ai/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'open-mistral-7b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      },
      parseResponse: async (response) => {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      },
      parseError: async (response) => {
        const data = await response.json().catch(() => ({}));
        return data?.error?.message || `Mistral error ${response.status}`;
      },
    }),
  },
};

function getProviderKey(config) {
  const envNames = [config.envKey, ...(config.fallbackEnvKeys || [])];
  for (const envName of envNames) {
    if (process.env[envName]) {
      return process.env[envName];
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider = 'gemini', model, prompt, imageBase64 = null, imageMimeType = 'image/jpeg' } = req.body || {};
    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      return res.status(400).json({ error: 'The selected AI provider is not supported.' });
    }

    const key = getProviderKey(config);
    if (!key) {
      return res.status(500).json({ error: 'The AI service is not configured on the server. Please contact support.' });
    }

    const requestConfig = config.buildRequest({ key, prompt, model, imageBase64, imageMimeType });
    const response = await fetch(requestConfig.url, requestConfig.options);

    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: 'The AI service is busy right now. Please wait a moment and try again.' });
      if (response.status === 401) return res.status(401).json({ error: 'AI authentication failed. Please check your configuration.' });
      return res.status(response.status).json({ error: 'The AI service is temporarily unavailable. Please try again in a moment.' });
    }

    const text = await requestConfig.parseResponse(response);
    if (!text) {
      return res.status(502).json({ error: 'The AI returned an empty response. Please try again.' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong. Please try again in a moment.' });
  }
}