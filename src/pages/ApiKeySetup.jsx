import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGemini } from '../contexts/GeminiContext';
import { useAuth } from '../contexts/AuthContext';
import { Key, ArrowRight, ExternalLink, Loader2, Sparkles, Cpu, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiKeySetup() {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { setGeminiKey, testKey } = useGemini();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  // Admin doesn't need a Gemini key — redirect them straight to profile setup
  useEffect(() => {
    if (isAdmin) {
      toast.success('Admin access — built-in AI keys active. Skipping key setup.');
      navigate('/setup/profile', { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) {
      toast.error('Please enter an API key');
      return;
    }

    setLoading(true);
    try {
      await testKey(cleanKey);
      setGeminiKey(cleanKey);
      toast.success('Gemini API key validated successfully!');
      navigate('/setup/profile');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to validate API key. Please check the key and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render nothing while admin redirect happens
  if (isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-gradient-to-tr from-violet-600 to-emerald-500 p-3 rounded-2xl shadow-lg shadow-violet-500/20">
            <Key className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Set Up Gemini AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          This app runs entirely in your browser using your own Gemini API key.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-xl py-8 px-4 border border-slate-800/80 shadow-2xl rounded-3xl sm:px-10">
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50 space-y-4">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" /> How to get a free API key:
              </h3>
              <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2.5">
                <li>
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Sign in with your Google account.</li>
                <li>Click the green <strong className="text-slate-200">"Create API key"</strong> button.</li>
                <li>Copy the key and paste it below.</li>
              </ol>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="api-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Gemini API Key
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <input
                    id="api-key"
                    name="api-key"
                    type="password"
                    required
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-mono"
                    placeholder="AIzaSy..."
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-slate-950 transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating API Key...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
