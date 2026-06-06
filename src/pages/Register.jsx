import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { verifyInviteToken } from '../utils/invite';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    async function checkToken() {
      if (!emailParam || !tokenParam) {
        setIsValid(false);
        setVerifying(false);
        return;
      }
      const valid = await verifyInviteToken(emailParam, tokenParam);
      setIsValid(valid);
      setVerifying(false);
    }
    checkToken();
  }, [emailParam, tokenParam]);

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
      await register(emailParam, form.password, form.name);
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

  if (verifying) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Verifying invite link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-white/50 text-xs mt-2 leading-relaxed">
              This registration link is invalid, expired, or unauthorized. Please contact your fitness coach to request a personal registration link.
            </p>
          </div>
          <Link
            to="/login"
            className="block w-full bg-white/8 hover:bg-white/12 border border-white/12 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-violet mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FitAI</h1>
          <p className="text-white/45 mt-1 text-sm">Start your transformation today</p>
        </div>

        <div className="bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Activate Account</h2>
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md text-emerald-400 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Valid Invite
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Authorized Email</label>
              <input
                type="email"
                value={emailParam}
                disabled
                className="w-full bg-dark-800/40 border border-white/8 rounded-xl px-4 py-3 text-white/45 text-sm focus:outline-none cursor-not-allowed font-medium"
              />
            </div>

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
              id="register-submit"
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-violet mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating...
                </span>
              ) : 'Activate Account'}
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
