import { useState } from 'react';
import { Loader2, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import toast from 'react-hot-toast';

const PLAN_LABELS = { personal: 'Personal', pt_pro: 'PT Pro' };

export default function CompletePayment() {
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const planLabel = PLAN_LABELS[profile?.pendingPlan] || 'your plan';

  const resumeCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: profile?.pendingPlan, userId: user.uid, userEmail: user.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open checkout.');
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err.message || 'Could not open checkout.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-700/60 border border-dark-600 rounded-3xl p-8 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
          <CreditCard className="w-7 h-7 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Finish setting up {planLabel}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Your account is created, but the subscription checkout wasn't completed. Finish payment to unlock your plans, check-ins and AI coaching.
          </p>
        </div>
        <button
          onClick={resumeCheckout}
          disabled={loading}
          className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Complete payment
        </button>
        <button
          onClick={logout}
          className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}
