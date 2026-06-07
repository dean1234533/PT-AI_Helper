/**
 * Multi-Provider AI Context
 *
 * - Regular users: Gemini only (their own key from localStorage)
 * - Admin: can switch between Gemini, Groq, Cerebras, OpenRouter, Mistral
 *   using the built-in VITE_ env keys — no key entry required
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { lsGet, lsSet } from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';


export const GEMINI_KEY_STORAGE    = 'fitai_gemini_key';
export const ADMIN_PROVIDER_KEY    = 'fitai_admin_provider';
export const ADMIN_MODEL_KEY       = 'fitai_admin_model';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Provider definitions ─────────────────────────────────────────────────────
export const AI_PROVIDERS = {
  gemini: {
    id:       'gemini',
    label:    'Gemini',
    badge:    'Google',
    color:    '#4285F4',
    models: [
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (fast)' },
      { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
      { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
    ],
    supportsVision: true,
  },
  groq: {
    id:       'groq',
    label:    'Groq',
    badge:    'Fast',
    color:    '#2563eb',
    models: [
      { id: 'llama-3.3-70b-versatile',    label: 'Llama 3.3 70B (versatile)' },
      { id: 'llama-3.1-8b-instant',       label: 'Llama 3.1 8B (instant)' },
      { id: 'mixtral-8x7b-32768',         label: 'Mixtral 8x7B' },
    ],
    supportsVision: false,
  },
  cerebras: {
    id:       'cerebras',
    label:    'Cerebras',
    badge:    'Ultra-fast',
    color:    '#6B48FF',
    models: [
      { id: 'llama-3.3-70b', label: 'Llama 3.3 70B (best)' },
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B (fast)' },
      { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
    ],
    supportsVision: false,
  },
  openrouter: {
    id:       'openrouter',
    label:    'OpenRouter',
    badge:    '100+ Models',
    color:    '#10B981',
    models: [
      { id: 'openrouter/free', label: 'OpenRouter Free Router' },
      { id: 'deepseek/deepseek-chat-v3.2:free', label: 'DeepSeek V3.2 (free)' },
      { id: 'qwen/qwen3-coder:free', label: 'Qwen Coder (free)' },
      { id: 'z-ai/glm-4.7:free', label: 'GLM 4.7 (free)' },
    ],
    supportsVision: false,
  },
  mistral: {
    id:       'mistral',
    label:    'Mistral',
    badge:    'EU AI',
    color:    '#FF7000',
    models: [
      { id: 'mistral-small-latest',  label: 'Mistral Small (fast)' },
      { id: 'open-mistral-7b',       label: 'Open Mistral 7B (free)' },
      { id: 'open-mixtral-8x7b',     label: 'Open Mixtral 8x7B' },
    ],
    supportsVision: false,
  },
};

const GeminiContext = createContext(null);

export function GeminiProvider({ children }) {
  const { user } = useAuth();
  const [geminiKey, setGeminiKeyState] = useState(() => lsGet(GEMINI_KEY_STORAGE, ''));
  const [activeProvider, setActiveProviderState] = useState(() =>
    lsGet(ADMIN_PROVIDER_KEY, 'gemini')
  );
  const [activeModel, setActiveModelState] = useState(() =>
    lsGet(ADMIN_MODEL_KEY, 'gemini-2.5-flash-lite')
  );

  const setGeminiKey = useCallback((key) => {
    setGeminiKeyState(key);
    lsSet(GEMINI_KEY_STORAGE, key);
  }, []);

  const clearGeminiKey = useCallback(() => {
    setGeminiKeyState('');
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  }, []);

  const setAdminProvider = useCallback((providerId) => {
    const provider = AI_PROVIDERS[providerId];
    if (!provider) return;
    const defaultModel = provider.models[0].id;
    setActiveProviderState(providerId);
    setActiveModelState(defaultModel);
    lsSet(ADMIN_PROVIDER_KEY, providerId);
    lsSet(ADMIN_MODEL_KEY, defaultModel);
  }, []);

  const setAdminModel = useCallback((modelId) => {
    setActiveModelState(modelId);
    lsSet(ADMIN_MODEL_KEY, modelId);
  }, []);

  // ── Gemini call ─────────────────────────────────────────────────────────────
  const callGeminiDirect = useCallback(async (prompt, imageBase64, imageMimeType, model) => {
    const isCurrentUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
    const key = (isCurrentUserAdmin && import.meta.env.VITE_GEMINI_API_KEY)
      || lsGet(GEMINI_KEY_STORAGE, '');
    
    if (!key) throw new Error('AI is not set up yet. Please add your API key in Settings.');

    const parts = [];
    if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
    parts.push({ text: prompt });

    const res = await fetch(`${GEMINI_BASE}/${model || 'gemini-2.5-flash-lite'}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || '';
      if (res.status === 401 || msg.toLowerCase().includes('api key')) throw new Error('Your API key appears to be invalid. Please check your key in Settings.');
      if (res.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
      if (res.status === 403) throw new Error('Access denied. Please check your API key has the correct permissions.');
      throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('The AI returned an empty response. Please try again.');
    return text;
  }, [user]);

  // ── Groq call ───────────────────────────────────────────────────────────────
  const callGroq = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) throw new Error('AI service is not configured. Please contact support.');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
      throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  // ── Cerebras call ───────────────────────────────────────────────────────────
  const callCerebras = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_CEREBRAS_API_KEY;
    if (!key) throw new Error('AI service is not configured. Please contact support.');
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
      throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  // ── OpenRouter call ─────────────────────────────────────────────────────────
  const callOpenRouter = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!key) throw new Error('AI service is not configured. Please contact support.');

    // Try models in order — free-tier models can go offline
    const modelsToTry = [...new Set([
      model,
      'openrouter/free',
      'deepseek/deepseek-chat-v3.2:free',
      'qwen/qwen3-coder:free',
      'z-ai/glm-4.7:free',
    ].filter(Boolean))];
    const errors = [];

    for (const modelId of modelsToTry) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PT AI Helper',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errors.push(`${modelId}: ${data?.error?.message || data?.message || res.statusText}`);
        if (res.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
        continue;
      }

      // OpenRouter returns 200 but with an error body when a model has no endpoints
      if (data?.error) {
        errors.push(`${modelId}: ${data.error.message || data.error.code || 'OpenRouter returned an error.'}`);
        continue;
      }

      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
      errors.push(`${modelId}: empty response`);
    }

    throw new Error(errors[0] || 'OpenRouter is temporarily unavailable. Please try again in a moment.');
  }, []);

  // ── Mistral call ────────────────────────────────────────────────────────────
  const callMistral = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_MISTRAL_API_KEY;
    if (!key) throw new Error('AI service is not configured. Please contact support.');
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'open-mistral-7b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
      throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  /**
   * Universal AI call — routes to the correct provider.
   * Admin uses activeProvider/activeModel from state.
   * Regular users always go to Gemini.
   *
   * @param {string} prompt
   * @param {string|null} imageBase64  - Only supported by Gemini
   * @param {string} imageMimeType
   * @param {string} [modelOverride]  - Override the active model (optional)
   * @param {boolean} [isAdmin]       - Pass true to use admin provider routing
   */
  const callGemini = useCallback(
    async (prompt, imageBase64 = null, imageMimeType = 'image/jpeg', modelOverride = null, isAdminOverride = false) => {
      const isCurrentUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
      const useAdminRouting = isAdminOverride || isCurrentUserAdmin;
      const provider = useAdminRouting ? activeProvider : 'gemini';
      const model    = modelOverride || (useAdminRouting ? activeModel : 'gemini-2.5-flash-lite');

      if (useAdminRouting) {
        const callAdminAI = (providerId, modelId) => fetch('/api/admin-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: providerId,
            model: modelId,
            prompt,
            imageBase64,
            imageMimeType,
          }),
        });

        const routedProvider = imageBase64 && provider !== 'gemini' ? 'gemini' : provider;
        const routedModel = imageBase64 && provider !== 'gemini' ? 'gemini-2.5-flash-lite' : model;
        let response = await callAdminAI(routedProvider, routedModel);
        const data = await response.json().catch(() => ({}));

        if (!response.ok && routedProvider !== 'gemini' && (response.status === 429 || response.status === 502)) {
          response = await callAdminAI('gemini', 'gemini-2.5-flash-lite');
          const fallbackData = await response.json().catch(() => ({}));
          if (response.ok && fallbackData?.text) return fallbackData.text;
          throw new Error(fallbackData.detail || fallbackData.error || data.detail || data.error || 'The AI service is temporarily unavailable. Please try again in a moment.');
        }

        if (!response.ok) {
          if (response.status === 429) throw new Error('The AI service is busy right now. Please wait a moment and try again.');
          throw new Error(data.detail || data.error || 'The AI service is temporarily unavailable. Please try again in a moment.');
        }
        if (!data?.text) {
          throw new Error('The AI returned an empty response. Please try again.');
        }
        return data.text;
      }

      // If image is provided but provider doesn't support vision, fall back to Gemini
      if (imageBase64 && provider !== 'gemini') {
        return callGeminiDirect(prompt, imageBase64, imageMimeType, 'gemini-2.5-flash-lite');
      }

      switch (provider) {
        case 'groq':       return callGroq(prompt, model);
        case 'cerebras':   return callCerebras(prompt, model);
        case 'openrouter': return callOpenRouter(prompt, model);
        case 'mistral':    return callMistral(prompt, model);
        case 'gemini':
        default:           return callGeminiDirect(prompt, imageBase64, imageMimeType, model);
      }
    },
    [activeProvider, activeModel, callGeminiDirect, callGroq, callCerebras, callOpenRouter, callMistral, user]
  );

  /**
   * Smart AI call — admins use server-side provider routing,
   * regular users use their own stored Gemini key directly.
   */
  const callAI = useCallback(
    async (prompt, imageBase64 = null, imageMimeType = 'image/jpeg') => {
      const isCurrentUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
      return callGemini(prompt, imageBase64, imageMimeType, null, isCurrentUserAdmin);
    },
    [callGemini, user]
  );

  const testKey = useCallback(async (keyToTest) => {
    const isCurrentUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
    const key = keyToTest 
      || (isCurrentUserAdmin && import.meta.env.VITE_GEMINI_API_KEY)
      || lsGet(GEMINI_KEY_STORAGE, '');
    const res = await fetch(`${GEMINI_BASE}/gemini-2.5-flash-lite:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say "OK" only.' }] }] }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Invalid API key');
    }
    return true;
  }, [user]);

  return (
    <GeminiContext.Provider value={{
      geminiKey,
      setGeminiKey,
      clearGeminiKey,
      callGemini,
      callAI,
      testKey,
      // Admin provider controls
      activeProvider,
      activeModel,
      setAdminProvider,
      setAdminModel,
      AI_PROVIDERS,
    }}>
      {children}
    </GeminiContext.Provider>
  );
}

export const useGemini = () => {
  const ctx = useContext(GeminiContext);
  if (!ctx) throw new Error('useGemini must be used within GeminiProvider');
  return ctx;
};
