import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const PLAN_LABELS = { personal: 'Personal', pt_pro: 'PT Pro' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const sessionId = searchParams.get('session_id');
  const isPostPayment = searchParams.get('subscription') === 'success' && Boolean(sessionId);

  // Paid-plan signups now go: pricing card -> Stripe Checkout -> here. The
  // account is only ever created AFTER payment is verified, so there's no
  // window where a Firebase password exists for someone who never paid.
  const [checkoutState, setCheckoutState] = useState(isPostPayment ? 'verifying' : 'n/a');
  const [paidSession, setPaidSession] = useState(null);

  useEffect(() => {
    if (!isPostPayment) return;
    (async () => {
      try {
        const res = await fetch(`/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (res.ok && data.paid) {
          setPaidSession(data);
          setCheckoutState('paid');
        } else {
          setCheckoutState('unpaid');
        }
      } catch {
        setCheckoutState('unpaid');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPostPayment, sessionId]);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);

  useEffect(() => {
    if (paidSession?.email) setForm((f) => ({ ...f, email: paidSession.email }));
  }, [paidSession]);

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
    if (!ageConfirmed) { toast.error('You must confirm you are 18 or older'); return; }
    if (!healthConsent) { toast.error('You must consent to health data processing to use this app'); return; }
    setLoading(true);
    try {
      const cred = await register(form.email, form.password, form.name);

      if (inviteToken) {
        try {
          const res = await fetch('/api/complete-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteToken, clientUid: cred.user.uid }),
          });
          const data = await res.json();
          if (res.ok) {
            await setDoc(
              doc(db, 'users', cred.user.uid, 'data', 'profile'),
              { trainerId: data.trainerId, trainerName: data.trainerName, trainerEmail: data.trainerEmail },
              { merge: true }
            );
            toast.success(`Account created! You're connected with ${data.trainerName}.`);
            navigate('/setup/profile');
            return;
          }
          toast.error(data.error || 'That invite link is no longer valid — continuing as a regular account.');
        } catch {
          toast.error('Could not process the invite link — continuing as a regular account.');
        }
      }

      if (isPostPayment && paidSession) {
        // Payment already verified above — activate immediately, no
        // webhook round-trip needed for this first activation.
        await setDoc(
          doc(db, 'users', cred.user.uid, 'data', 'profile'),
          {
            subscriptionStatus: 'active',
            plan: paidSession.plan,
            stripeCustomerId: paidSession.stripeCustomerId || null,
            stripeSubscriptionId: paidSession.stripeSubscriptionId || null,
          },
          { merge: true }
        );

        // Tag the Stripe subscription with this uid so future renewal/
        // cancellation webhooks (which only carry the subscription, not the
        // checkout session) can find this user. Best-effort — if it fails,
        // the account is still correctly activated above.
        try {
          const idToken = await cred.user.getIdToken();
          await fetch('/api/link-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ sessionId, userId: cred.user.uid }),
          });
        } catch {
          // Non-fatal — the account is already active either way.
        }

        toast.success('Payment confirmed! Let\'s set up your profile.');
        navigate('/setup/profile');
        return;
      }

      toast.success('Account created! Let\'s set up your API key.');
      navigate('/setup/api-key');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else {
        toast.error(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkoutState === 'verifying') {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
          <p className="text-sm">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (checkoutState === 'unpaid') {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-600/80 border border-white/8 rounded-2xl p-8 text-center space-y-4">
          <XCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">We couldn't confirm that payment</h1>
          <p className="text-sm text-white/50">
            Your checkout session wasn't completed, so no account was created — nothing was charged. Head back to pricing to try again.
          </p>
          <Link to="/pricing" className="inline-block mt-2 text-brand-400 hover:text-brand-300 font-semibold text-sm">
            ← Back to pricing
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
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="DB's Workouts" className="w-16 h-16 rounded-2xl object-contain shadow-glow-violet mb-4" />
          <h1 className="text-2xl font-bold text-white">DB's Workouts</h1>
          <p className="text-white/45 mt-1 text-sm">Start your transformation today</p>
        </div>

        <div className="bg-dark-600/80 border border-white/8 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          {checkoutState === 'paid' ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                Payment confirmed for {PLAN_LABELS[paidSession?.plan] || 'your plan'} — set a password to finish creating your account.
              </p>
            </div>
          ) : null}

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
                readOnly={checkoutState === 'paid'}
                autoComplete="email"
                className="w-full bg-dark-800/60 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60 read-only:opacity-60 read-only:cursor-not-allowed"
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

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
                />
                <span className="text-xs text-white/50 leading-relaxed">
                  I confirm I am <strong className="text-white/70">18 years or older</strong>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={healthConsent}
                  onChange={(e) => setHealthConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
                />
                <span className="text-xs text-white/50 leading-relaxed">
                  I consent to my health and fitness data (weight, height, goals, dietary information, progress photos) being processed to generate personalised plans. I have read the{' '}
                  <a href="https://dbworkouts.co.uk/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">Privacy Policy</a>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !ageConfirmed || !healthConsent}
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
