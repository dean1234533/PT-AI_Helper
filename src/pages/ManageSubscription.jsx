import { useState } from 'react';
import { Zap, CreditCard, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import { useSubscription } from '../contexts/SubscriptionContext';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

export default function ManageSubscription() {
  const navigate = useNavigate();
  const { sub, isPro, isAdmin } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handlePortal = async () => {
    if (!sub?.stripeCustomerId) {
      toast.error('No billing account found. Contact support.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeCustomerId: sub.stripeCustomerId,
          returnUrl: window.location.origin + '/dashboard',
        }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Could not open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEO title="Manage Subscription" noIndex />
      <div className="p-4 sm:p-8 max-w-lg mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isAdmin ? 'bg-yellow-100' : 'bg-brand-100'}`}>
            {isAdmin ? <Zap className="w-7 h-7 text-yellow-600" /> : <CreditCard className="w-7 h-7 text-brand-600" />}
          </div>

          {isAdmin ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Account</h1>
              <p className="text-gray-500 text-sm">Your account has unlimited access with no billing required.</p>
            </>
          ) : isPro ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Pro Plan — Active</h1>
              <p className="text-gray-500 text-sm mb-6">You have unlimited plan generation and all Pro features.</p>
              <Button onClick={handlePortal} loading={loading} variant="secondary" className="w-full">
                <CreditCard className="w-4 h-4" /> Open Billing Portal
              </Button>
              <p className="text-xs text-gray-400 mt-3">Cancel, update payment method, or download invoices via Stripe's secure portal.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Free Plan</h1>
              <p className="text-gray-500 text-sm mb-6">Upgrade to Pro for unlimited plans at £19/month.</p>
              <Button onClick={() => navigate('/pricing')} className="w-full">
                <Zap className="w-4 h-4" /> Upgrade to Pro
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
