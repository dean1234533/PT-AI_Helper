import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(form.email, form.password);

      // Self-heal accounts whose invite-linking failed at signup time (e.g.
      // created before a server-side fix) — harmless no-op otherwise.
      try {
        const res = await fetch('/api/complete-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, clientUid: result.user.uid }),
        });
        if (res.ok) {
          const data = await res.json();
          await setDoc(
            doc(db, 'users', result.user.uid, 'data', 'profile'),
            { trainerId: data.trainerId, trainerName: data.trainerName, trainerEmail: data.trainerEmail },
            { merge: true }
          );
          toast.success(`Connected with ${data.trainerName}!`);
        }
      } catch { /* best-effort, ignore */ }

      // Admin goes straight to dashboard, regular users check setup flow
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.code === 'auth/invalid-credential' ? 'Invalid email or password' : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      toast.success('Password reset email sent! Please check your inbox.');
      setResetMode(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-grid min-h-screen text-white grid lg:grid-cols-[1.08fr_.92fr] relative overflow-hidden">
      <section className="hidden lg:flex min-h-screen relative p-14 xl:p-20 flex-col justify-between border-r border-white/[.07]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[.05] flex items-center justify-center">
            <img src="/logo.png" alt="DB's Workouts" className="w-10 h-10 rounded-xl object-contain" />
          </div>
          <div>
            <p className="font-bold text-base">DB's Workouts</p>
            <p className="text-white/35 text-[10px] uppercase tracking-[.2em]">Private coaching</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 text-brand-300 text-xs font-bold uppercase tracking-[.18em] mb-7">
            <Sparkles className="w-4 h-4" /> Built around your goals
          </div>
          <h1 className="text-5xl xl:text-6xl font-extrabold tracking-[-.055em] leading-[1.03] text-[#f7f2ea]">
            Coaching that moves at your pace.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/45 max-w-lg">
            One focused place for your training plan, nutrition, weekly check-ins and direct AI support.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-lg">
            {['Adaptive weekly plans', 'Progress in one view', 'Personal nutrition', 'Private and secure'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-300 flex items-center justify-center"><Check className="w-3 h-3" /></span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/30 text-xs">
          <ShieldCheck className="w-4 h-4" /> Your coaching data stays protected.
        </div>
      </section>

      <section className="min-h-screen flex items-center justify-center px-5 py-10 sm:px-10 bg-black/10">
      <div className="relative w-full max-w-[460px] my-auto animate-fade-in-up">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="DB's Workouts" className="w-11 h-11 rounded-xl object-contain" />
          <div><p className="font-bold">DB's Workouts</p><p className="text-white/35 text-xs">Private coaching</p></div>
        </div>

        <div className="premium-card rounded-[28px] p-6 sm:p-9">
          {resetMode ? (
            <>
              <p className="text-brand-400 text-[10px] font-bold uppercase tracking-[.2em] mb-3">Account recovery</p>
              <h2 className="text-2xl font-bold text-white mb-2">Reset your password</h2>
              <p className="text-white/45 text-sm mb-7">Enter your email and we'll send you a secure reset link.</p>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/70 block mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-violet mt-2"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="text-center text-sm text-white/40 mt-6">
                <button
                  onClick={() => setResetMode(false)}
                  className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                >
                  Back to sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-brand-400 text-[10px] font-bold uppercase tracking-[.2em] mb-3">Member access</p>
              <h2 className="text-3xl font-bold text-[#f7f2ea] mb-2">Welcome back</h2>
              <p className="text-white/40 text-sm mb-8">Sign in to continue your coaching programme.</p>
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="text-sm font-medium text-white/70 block mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="you@example.com"
                    required
                    autoComplete="off"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-white/70 block">Password</label>
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={update('password')}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 pr-11 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent transition-all"
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
                <button
                  type="submit"
                  disabled={loading}
                  id="login-submit"
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-violet mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : <span className="flex items-center justify-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></span>}
                </button>
              </form>
              <p className="text-center text-sm text-white/40 mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign up</Link>
              </p>
            </>
          )}
        </div>
        <p className="text-center text-white/20 text-xs mt-6">Secure member portal · DB's Workouts</p>
      </div>
      </section>
    </div>
  );
}
