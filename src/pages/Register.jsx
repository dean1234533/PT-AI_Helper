import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      toast.success('Account created! Let\'s set up your API key.');
      navigate('/setup/api-key');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4 relative overflow-hidden">
      <SEO title="Sign Up" canonical="https://dbworkouts.co.uk/ai-plans" noIndex />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-violet mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DB's AI</h1>
          <p className="text-white/45 mt-1 text-sm">Start your transformation today</p>
        </div>

        <div className="bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Your name"
                required
                autoComplete="name"
                className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 pr-11 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                placeholder="Repeat password"
                required
                autoComplete="new-password"
                className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-violet mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
