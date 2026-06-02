import { useState } from 'react';
import { Zap, Check, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import toast from 'react-hot-toast';

const PRO_FEATURES = [
  'Unlimited AI plans per month',
  'Full photo body composition analysis',
  'Complete 7-day meal plans',
  'Full workout programming',
  'Email delivery to clients',
  'Revision requests with extra context',
  'Priority support',
];

const FREE_FEATURES = [
  '3 plans per month',
  'All AI features included',
  'Email delivery to clients',
];

export default function UpgradeModal({ open, onClose }) {
  const { user } = useAuth();
  const { plansThisMonth, FREE_PLAN_LIMIT } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          returnUrl: window.location.origin,
        }),
      });
      if (!res.ok) throw new Error('Failed to create checkout');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-purple-700 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">Upgrade to Pro</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">You've used {plansThisMonth}/{FREE_PLAN_LIMIT} free plans this month</h2>
          <p className="text-white/80">Upgrade to Pro for unlimited plans and keep growing your business.</p>
        </div>

        {/* Pricing cards */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Free */}
          <div className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Free</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">£0</span>
              <span className="text-gray-400 text-sm">/month</span>
            </div>
            <ul className="space-y-2.5 mb-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-gray-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-400 cursor-not-allowed">
              Current plan
            </button>
          </div>

          {/* Pro */}
          <div className="border-2 border-brand-500 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">BEST VALUE</div>
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">Pro</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">£19</span>
              <span className="text-gray-400 text-sm">/month</span>
            </div>
            <ul className="space-y-2.5 mb-5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Redirecting...</> : 'Upgrade Now →'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-5">Cancel anytime · Secure payment via Stripe · No hidden fees</p>
      </div>
    </div>
  );
}
