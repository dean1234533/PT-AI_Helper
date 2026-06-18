import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const GEMINI_KEY_STORAGE = 'dbsai_gemini_key';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const GeminiContext = createContext(null);

export function GeminiProvider({ children }) {
  const { user } = useAuth();
  const [geminiKey, setGeminiKeyState] = useState(() => localStorage.getItem(GEMINI_KEY_STORAGE) || '');

  const setGeminiKey = useCallback((key) => {
    setGeminiKeyState(key);
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
  }, []);

  const clearGeminiKey = useCallback(() => {
    setGeminiKeyState('');
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  }, []);

  // Admin calls route through the server which auto-rotates all configured providers.
  // Regular users call Gemini directly with their own key.
  const callAI = useCallback(async (prompt, imageBase64 = null, imageMimeType = 'image/jpeg') => {
    const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

    if (isAdmin) {
      const res = await fetch('/api/admin-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64, imageMimeType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The AI service is temporarily unavailable. Please try again.');
      if (!data.text) throw new Error('The AI returned an empty response. Please try again.');
      return data.text;
    }

    // Regular user — Gemini direct with their stored key
    const key = geminiKey || localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    if (!key) throw new Error('AI is not set up yet. Please add your API key in Settings.');

    const parts = [];
    if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
    parts.push({ text: prompt });

    const res = await fetch(`${GEMINI_BASE}/gemini-2.5-flash-lite:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 32768 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || '';
      if (res.status === 401 || msg.toLowerCase().includes('api key')) throw new Error('Your API key appears to be invalid. Please check your key in Settings.');
      if (res.status === 429) throw new Error('The AI service is busy. Please wait a moment and try again.');
      if (res.status === 403) throw new Error('Access denied. Please check your API key permissions.');
      throw new Error('The AI service is temporarily unavailable. Please try again.');
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('The AI returned an empty response. Please try again.');
    return text;
  }, [user, geminiKey]);

  const testKey = useCallback(async (keyToTest) => {
    const key = keyToTest || geminiKey;
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
  }, [geminiKey]);

  return (
    <GeminiContext.Provider value={{ geminiKey, setGeminiKey, clearGeminiKey, callAI, testKey }}>
      {children}
    </GeminiContext.Provider>
  );
}

export const useGemini = () => {
  const ctx = useContext(GeminiContext);
  if (!ctx) throw new Error('useGemini must be used within GeminiProvider');
  return ctx;
};
