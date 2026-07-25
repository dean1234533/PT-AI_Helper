import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');

  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setInvalid(true);
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((recoveredEmail) => {
        setEmail(recoveredEmail);
        setVerifying(false);
      })
      .catch(() => {
        setInvalid(true);
        setVerifying(false);
      });
  }, [oobCode]);

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
      await confirmPasswordReset(auth, oobCode, form.password);
      setDone(true);
    } catch (err) {
      if (err.code === 'auth/expired-action-code') {
        toast.error('This reset link has expired. Please request a new one.');
      } else {
        toast.error('Failed to reset password. Please try again.');
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
          <p className="text-white/60 text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (invalid) {
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
            <h2 className="text-xl font-bold text-white">Link Invalid or Expired</h2>
            <p className="text-white/50 text-xs mt-2 leading-relaxed">
              This password reset link is invalid or has expired. Please request a new one from the sign-in page.
            </p>
          </div>
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Password Updated</h2>
            <p className="text-white/50 text-xs mt-2 leading-relaxed">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="block w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            Sign In
          </button>
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
          <img src="/logo.png" alt="DB's Workouts" className="w-16 h-16 rounded-2xl object-contain shadow-glow-violet mb-4" />
          <h1 className="text-2xl font-bold text-white">DB's Workouts</h1>
          <p className="text-white/45 mt-1 text-sm">Reset your password</p>
        </div>

        <div className="bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">Set New Password</h2>
          {email && (
            <p className="text-white/45 text-xs mb-6">for <span className="text-white/70 font-medium">{email}</span></p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
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
                  Updating...
                </span>
              ) : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
