const PROVIDER_CONFIGS = {
  gemini: {
    envKey: 'GEMINI_API_KEY',
    fallbackEnvKeys: ['VITE_GEMINI_API_KEY'],
    fallbackModels: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
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
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash-lite'}:generateContent`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
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
    fallbackModels: ['openrouter/free', 'deepseek/deepseek-chat-v3.2:free', 'qwen/qwen3-coder:free', 'z-ai/glm-4.7:free'],
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
          model: model || 'openrouter/free',
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
    const value = process.env[envName] || process.env[`VITE_${envName}`];
    if (value) {
      return value;
    }
  }
  return null;
}

function getModelsToTry(config, requestedModel) {
  return [...new Set([requestedModel, ...(config.fallbackModels || [])].filter(Boolean))];
}

async function parseProviderError(config, response) {
  if (config.parseError) return config.parseError(response);
  return `${response.status} ${response.statusText}`;
}

function shouldTryNextModel(response, message = '') {
  if ([400, 404, 402, 429, 503, 529].includes(response.status)) return true;
  const lower = message.toLowerCase();
  return lower.includes('model') || lower.includes('not found') || lower.includes('unavailable') || lower.includes('quota');
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

    const errors = [];
    for (const modelToTry of getModelsToTry(config, model)) {
      const requestConfig = config.buildRequest({ key, prompt, model: modelToTry, imageBase64, imageMimeType });
      const response = await fetch(requestConfig.url, requestConfig.options);

      if (!response.ok) {
        const providerMessage = await parseProviderError(config, response);
        errors.push(`${modelToTry}: ${providerMessage}`);

        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ error: providerMessage || 'AI authentication failed. Please check your configuration.' });
        }

        if (shouldTryNextModel(response, providerMessage)) continue;
        return res.status(response.status).json({ error: providerMessage || 'The AI service is temporarily unavailable. Please try again in a moment.' });
      }

      const text = await requestConfig.parseResponse(response);
      if (text) {
        return res.status(200).json({ text, provider, model: modelToTry });
      }

      errors.push(`${modelToTry}: empty response`);
    }

    return res.status(502).json({
      error: 'The AI service could not return a response with the available models.',
      detail: errors.join(' | '),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again in a moment.' });
  }
}
