import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Dumbbell, ArrowLeft, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import toast from 'react-hot-toast';

const FREE_FEATURES = [
  '3 AI plans per month',
  'Full nutrition plans (macros, meals, shopping list)',
  'Full workout plans (sets, reps, progression)',
  'Photo body composition analysis',
  'Email delivery to clients',
  'Trainer notes & AI revision requests',
  'Unlimited clients',
];

const PRO_FEATURES = [
  'Unlimited AI plans per month',
  'Full nutrition plans (macros, meals, shopping list)',
  'Full workout plans (sets, reps, progression)',
  'Photo body composition analysis',
  'Email delivery to clients',
  'Trainer notes & AI revision requests',
  'Unlimited clients',
  'Priority support',
  'Early access to new features',
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isAdmin } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) { navigate('/register'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, userEmail: user.email, returnUrl: window.location.origin }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <SEO
        title="Pricing"
        description="Start free with 3 AI plans per month. Upgrade to Pro for unlimited plans at £19/month."
        canonical={`${import.meta.env.VITE_APP_URL}/pricing`}
      />

      {user && (
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      )}

      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Simple, honest pricing</h1>
        <p className="text-gray-500 text-lg">Start free. Upgrade when your client list grows.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black text-gray-900">£0</span>
              <span className="text-gray-400 text-sm mb-1.5">/month</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Try it out. No card needed.</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!user ? (
            <button onClick={() => navigate('/register')} className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors">
              Get started free
            </button>
          ) : !isPro ? (
            <button disabled className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed">
              Current plan
            </button>
          ) : null}
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-b from-brand-600 to-brand-700 rounded-2xl p-8 flex flex-col shadow-2xl shadow-brand-500/25 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-bl-2xl">
            BEST VALUE
          </div>
          <div className="mb-6">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Pro</p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black text-white">£19</span>
              <span className="text-white/60 text-sm mb-1.5">/month</span>
            </div>
            <p className="text-sm text-white/70 mt-2">Cancel anytime. No lock-in.</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/90">
                <CheckCircle className="w-4 h-4 text-white mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {isAdmin ? (
            <button disabled className="w-full py-3.5 rounded-xl bg-white/20 text-white/60 font-semibold text-sm cursor-not-allowed">
              Admin — unlimited access
            </button>
          ) : isPro ? (
            <button disabled className="w-full py-3.5 rounded-xl bg-white/20 text-white/60 font-semibold text-sm cursor-not-allowed">
              ✓ Current plan
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            >
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Redirecting...</> : <><Zap className="w-4 h-4" /> Upgrade to Pro</>}
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 text-center space-y-2">
        <p className="text-sm text-gray-400">Secure payment by Stripe · Cancel any time from your account settings</p>
        <p className="text-xs text-gray-300">Questions? Reach us at hello@yourptaihelper.com</p>
      </div>
    </div>
  );

  // Render inside Layout if logged in, standalone if not
  return user ? <Layout>{content}</Layout> : (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">PT AI Helper</span>
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</button>
        </div>
      </nav>
      {content}
    </>
  );
}
