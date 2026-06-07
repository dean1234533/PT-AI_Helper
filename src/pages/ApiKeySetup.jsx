import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, ArrowRight, CheckCircle, ExternalLink, Loader2, Eye, EyeOff, Dumbbell } from 'lucide-react';
import { useGemini } from '../contexts/GeminiContext';
import toast from 'react-hot-toast';

export default function ApiKeySetup() {
  const navigate = useNavigate();
  const { setGeminiKey, testKey } = useGemini();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error('Please enter your Gemini API key');
      return;
    }
    setLoading(true);
    try {
      await testKey(trimmed);
      setGeminiKey(trimmed);
      toast.success('API key verified successfully!');
      navigate('/setup/profile');
    } catch (err) {
      toast.error(err.message || 'Invalid API key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-violet mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FitAI</h1>
          <p className="text-white/45 mt-1 text-sm">Step 1 of 2 — Connect AI</p>
        </div>

        <div className="bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Add Your Gemini API Key</h2>
          </div>
          <p className="text-white/45 text-sm mb-6">
            FitAI uses Google Gemini to analyze your body type and generate personalized plans. Your key is stored securely on your device only.
          </p>

          <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-6 space-y-2">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">How to get your free key:</p>
            <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
              <li>Visit Google AI Studio (aistudio.google.com)</li>
              <li>Sign in with your Google account</li>
              <li>Click "Get API Key" then "Create API Key"</li>
              <li>Copy and paste the key below</li>
            </ol>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold mt-1 transition-colors"
            >
              Open Google AI Studio
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Gemini API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 pr-11 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-violet flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying key...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            Your API key is stored locally on your device and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
