import { useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ClipboardList, Send, Plus, ArrowRight, Zap, Crown, TrendingUp } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout, { PageHeader } from '../components/Layout';
import { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useClients } from '../hooks/useClients';
import { usePlans } from '../hooks/usePlans';
import toast from 'react-hot-toast';

function timeAgo(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isPro, isAdmin, plansThisMonth, plansRemaining, FREE_PLAN_LIMIT, activatePro } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients, loading: cLoading } = useClients();
  const { plans, loading: pLoading } = usePlans();

  // Handle return from Stripe checkout
  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    const sessionId = searchParams.get('session_id');
    if (upgraded !== 'true' || !sessionId) return;

    setSearchParams({}, { replace: true });

    fetch(`/api/verify-checkout?session_id=${sessionId}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.paid && user) {
          await activatePro(data.stripeCustomerId, data.stripeSubscriptionId);
          toast.success('Welcome to Pro! Unlimited plans unlocked 🎉', { duration: 6000 });
        }
      })
      .catch(() => toast.error('Could not verify payment. Contact support if charge occurred.'));
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const thisWeekPlans = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return plans.filter((p) => (p.createdAt?.toDate?.() || new Date(0)).getTime() > weekAgo);
  }, [plans]);

  const sentPlans = plans.filter((p) => p.status === 'sent');

  if (cLoading || pLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full p-20">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Dashboard" noIndex />
      <div className="p-4 sm:p-8">
        <PageHeader
          title={`${greeting}, ${user?.displayName?.split(' ')[0] || 'Trainer'}`}
          subtitle="Here's what's happening with your clients today."
          action={
            <Button onClick={() => navigate('/plans/new')}>
              <Plus className="w-4 h-4" /> New Plan
            </Button>
          }
        />

        {/* Plan usage banner */}
        {!isPro && !isAdmin && (
          <div className={`mb-6 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${plansRemaining === 0 ? 'bg-orange-50 border border-orange-200' : 'bg-brand-50 border border-brand-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${plansRemaining === 0 ? 'bg-orange-100' : 'bg-brand-100'}`}>
                <TrendingUp className={`w-5 h-5 ${plansRemaining === 0 ? 'text-orange-600' : 'text-brand-600'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${plansRemaining === 0 ? 'text-orange-900' : 'text-brand-900'}`}>
                  {plansRemaining === 0 ? 'Monthly limit reached' : `${plansRemaining} free plan${plansRemaining !== 1 ? 's' : ''} remaining this month`}
                </p>
                <p className={`text-xs mt-0.5 ${plansRemaining === 0 ? 'text-orange-700' : 'text-brand-700'}`}>
                  {plansThisMonth}/{FREE_PLAN_LIMIT} used · Resets on the 1st
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/pricing')}
              className={plansRemaining === 0 ? 'bg-orange-600 hover:bg-orange-700 shrink-0' : 'shrink-0'}
            >
              <Zap className="w-3.5 h-3.5" /> Upgrade to Pro — £19/mo
            </Button>
          </div>
        )}

        {isAdmin && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
            <Crown className="w-4 h-4 text-yellow-600 shrink-0" />
            <span><strong>Admin access</strong> — unlimited plans, all features unlocked.</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Clients" value={clients.length} icon={Users} color="brand" />
          <StatCard label="Plans This Week" value={thisWeekPlans.length} icon={ClipboardList} color="green" />
          <StatCard label="Plans Sent" value={sentPlans.length} icon={Send} color="purple" />
        </div>

        {/* Recent Plans */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Plans</h2>
            <button onClick={() => navigate('/plans')} className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">No plans yet</p>
              <p className="text-gray-400 text-sm mb-5">Create your first AI-powered plan for a client</p>
              <Button onClick={() => navigate('/plans/new')} size="sm">
                <Plus className="w-4 h-4" /> Create Plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-50 bg-gray-50/50">
                    <th className="px-5 sm:px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Goal</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Created</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plans.slice(0, 8).map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 sm:px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{plan.clientName}</p>
                          <p className="text-gray-400 text-xs">{plan.clientEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 hidden sm:table-cell">{plan.questionnaire?.primaryGoal || '—'}</td>
                      <td className="px-6 py-4"><Badge status={plan.status} /></td>
                      <td className="px-6 py-4 text-gray-400 hidden sm:table-cell">{timeAgo(plan.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(plan.status === 'draft' ? `/plans/${plan.id}/review` : `/plans/${plan.id}`)}
                          className="text-brand-600 hover:text-brand-700 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {clients.length === 0 && (
          <div className="mt-5 bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-brand-900">Add your first client</p>
              <p className="text-brand-700 text-sm mt-0.5">Start by adding a client, then generate their personalised plan.</p>
            </div>
            <Button onClick={() => navigate('/clients')} size="sm" className="shrink-0">Add Client</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
