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
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast)' },
      { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (powerful)' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
    ],
    supportsVision: true,
  },
  groq: {
    id:       'groq',
    label:    'Groq',
    badge:    'Fast',
    color:    '#F55036',
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
      { id: 'llama3.1-70b', label: 'Llama 3.1 70B' },
      { id: 'llama3.1-8b',  label: 'Llama 3.1 8B (fastest)' },
    ],
    supportsVision: false,
  },
  openrouter: {
    id:       'openrouter',
    label:    'OpenRouter',
    badge:    '100+ Models',
    color:    '#10B981',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'mistralai/mistral-7b-instruct:free',      label: 'Mistral 7B (free)' },
      { id: 'google/gemma-2-9b-it:free',               label: 'Gemma 2 9B (free)' },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini (free)' },
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
    lsGet(ADMIN_MODEL_KEY, 'gemini-2.5-pro')
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
    
    if (!key) throw new Error('No Gemini API key set. Please add your key in Settings.');

    const parts = [];
    if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
    parts.push({ text: prompt });

    const res = await fetch(`${GEMINI_BASE}/${model || 'gemini-2.5-pro'}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini error ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }, [user]);

  // ── Groq call ───────────────────────────────────────────────────────────────
  const callGroq = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) throw new Error('Groq API key not configured');
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  // ── Cerebras call ───────────────────────────────────────────────────────────
  const callCerebras = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_CEREBRAS_API_KEY;
    if (!key) throw new Error('Cerebras API key not configured');
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'llama3.1-70b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Cerebras error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  // ── OpenRouter call ─────────────────────────────────────────────────────────
  const callOpenRouter = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!key) throw new Error('OpenRouter API key not configured');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PT AI Helper',
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, []);

  // ── Mistral call ────────────────────────────────────────────────────────────
  const callMistral = useCallback(async (prompt, model) => {
    const key = import.meta.env.VITE_MISTRAL_API_KEY;
    if (!key) throw new Error('Mistral API key not configured');
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Mistral error ${res.status}`);
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
      const model    = modelOverride || (useAdminRouting ? activeModel : 'gemini-2.5-pro');

      // If image is provided but provider doesn't support vision, fall back to Gemini
      if (imageBase64 && provider !== 'gemini') {
        return callGeminiDirect(prompt, imageBase64, imageMimeType, 'gemini-2.5-pro');
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
   * Admin-aware call — automatically uses the admin's selected provider.
   * Use this in pages where you have access to the auth context.
   */
  const callAI = useCallback(
    async (prompt, imageBase64 = null, imageMimeType = 'image/jpeg') => {
      return callGemini(prompt, imageBase64, imageMimeType, null, true);
    },
    [callGemini]
  );

  const testKey = useCallback(async (keyToTest) => {
    const isCurrentUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
    const key = keyToTest 
      || (isCurrentUserAdmin && import.meta.env.VITE_GEMINI_API_KEY)
      || lsGet(GEMINI_KEY_STORAGE, '');
    const res = await fetch(`${GEMINI_BASE}/gemini-2.5-pro:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
