import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Edit3, ArrowLeft } from 'lucide-react';
import Layout, { Breadcrumb } from '../components/Layout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import NutritionViewer from '../components/plans/NutritionViewer';
import WorkoutViewer from '../components/plans/WorkoutViewer';
import { usePlans } from '../hooks/usePlans';
import { PageLoader } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const TABS = ['Nutrition Plan', 'Workout Plan', 'Notes'];

export default function PlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { getPlan, updatePlan } = usePlans();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    getPlan(planId).then((p) => {
      setPlan(p);
      setLoading(false);
    });
  }, [planId]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/send-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: plan.clientEmail,
          clientName: plan.clientName,
          trainerNotes: plan.trainerNotes,
          plan: plan.plan,
        }),
      });
      if (!res.ok) throw new Error();
      await updatePlan(planId, { sentAt: new Date().toISOString() });
      toast.success(`Plan resent to ${plan.clientEmail}`);
    } catch {
      toast.error('Failed to resend. Check your Resend API key.');
    } finally {
      setResending(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!plan) return <Layout><div className="p-8 text-gray-500">Plan not found.</div></Layout>;

  const q = plan.questionnaire || {};

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <Breadcrumb items={[{ label: 'Plans', href: '/plans' }, { label: `${plan.clientName}'s Plan` }]} />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{plan.clientName}'s Plan</h1>
              <Badge status={plan.status} />
            </div>
            <p className="text-gray-500 text-sm truncate">{plan.clientEmail} · {q.primaryGoal}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {plan.status !== 'sent' && (
              <Button onClick={() => navigate(`/plans/${planId}/review`)}>
                <Edit3 className="w-4 h-4" /> Review & Send
              </Button>
            )}
            {plan.status === 'sent' && (
              <Button variant="secondary" onClick={handleResend} loading={resending}>
                <Send className="w-4 h-4" /> Resend Email
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'border-b-2 border-brand-500 text-brand-700 bg-brand-50/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 0 && <NutritionViewer plan={plan.plan || {}} />}
            {activeTab === 1 && <WorkoutViewer plan={plan.plan || {}} />}
            {activeTab === 2 && (
              <div className="space-y-5">
                {plan.plan?.keyInsights?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">AI Key Insights</h3>
                    <ul className="space-y-2">
                      {plan.plan.keyInsights.map((ins, i) => (
                        <li key={i} className="bg-yellow-50 rounded-lg p-3 text-sm text-gray-800 flex items-start gap-2">
                          <span className="text-yellow-500">•</span>{ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.trainerNotes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Trainer Notes</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{plan.trainerNotes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
