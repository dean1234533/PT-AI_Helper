import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, RefreshCw, Save, User, Lightbulb, MessageSquare, ChevronRight } from 'lucide-react';
import Layout, { Breadcrumb } from '../components/Layout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';
import NutritionViewer from '../components/plans/NutritionViewer';
import WorkoutViewer from '../components/plans/WorkoutViewer';
import { usePlans } from '../hooks/usePlans';
import { PageLoader } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const TABS = ['Nutrition Plan', 'Workout Plan', 'Insights & Notes'];

export default function ReviewPlan() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { updatePlan, getPlan } = usePlans();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [revisionModal, setRevisionModal] = useState(false);
  const [revisionContext, setRevisionContext] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    getPlan(planId).then((p) => {
      setPlan(p);
      setTrainerNotes(p?.trainerNotes || '');
      setLoading(false);
    });
  }, [planId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePlan(planId, { trainerNotes, status: 'approved' });
      setPlan((p) => ({ ...p, trainerNotes, status: 'approved' }));
      toast.success('Plan saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await handleSave();
      const res = await fetch('/api/send-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: plan.clientEmail,
          clientName: plan.clientName,
          trainerNotes,
          plan: plan.plan,
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      await updatePlan(planId, { status: 'sent', sentAt: new Date().toISOString() });
      toast.success(`Plan sent to ${plan.clientEmail}`);
      navigate(`/plans/${planId}`);
    } catch {
      toast.error('Failed to send email. Check your Resend API key.');
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaire: { ...plan.questionnaire, additionalNotes: `${plan.questionnaire?.additionalNotes || ''}\n\nRevision request from trainer: ${revisionContext}` },
          photoUrl: plan.photoUrl || '',
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { plan: newPlan } = await res.json();
      await updatePlan(planId, { plan: newPlan, status: 'draft' });
      setPlan((p) => ({ ...p, plan: newPlan, status: 'draft' }));
      setRevisionModal(false);
      setRevisionContext('');
      toast.success('Plan regenerated!');
    } catch {
      toast.error('Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!plan) return (
    <Layout><div className="p-8 text-gray-500">Plan not found.</div></Layout>
  );

  const q = plan.questionnaire || {};

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <Breadcrumb items={[{ label: 'Plans', href: '/plans' }, { label: `${plan.clientName}'s Plan` }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{plan.clientName}'s Plan</h1>
              <Badge status={plan.status} />
            </div>
            <p className="text-gray-500 text-sm">{plan.clientEmail} · {q.primaryGoal} · {q.fitnessLevel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setRevisionModal(true)}>
              <RefreshCw className="w-4 h-4" /> Revision
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" /> Save
            </Button>
            <Button size="sm" onClick={handleSend} loading={sending} variant="success">
              <Send className="w-4 h-4" /> Send to Client
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: client summary */}
          <div className="space-y-4">
            {/* Client card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  {plan.clientName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{plan.clientName}</p>
                  <p className="text-xs text-gray-500">{plan.clientEmail}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Age', q.age ? `${q.age} years` : '—'],
                  ['Gender', q.gender || '—'],
                  ['Height', q.heightCm ? `${q.heightCm} cm` : '—'],
                  ['Weight', q.weightKg ? `${q.weightKg} kg` : '—'],
                  ['Goal weight', q.goalWeightKg ? `${q.goalWeightKg} kg` : '—'],
                  ['Goal', q.primaryGoal || '—'],
                  ['Timeline', q.timeline || '—'],
                  ['Fitness level', q.fitnessLevel || '—'],
                  ['Activity', q.activityLevel || '—'],
                  ['Diet style', q.dietaryStyle || '—'],
                  ['Meals/day', q.mealsPerDay || '—'],
                  ['Training days', q.workoutDaysPerWeek ? `${q.workoutDaysPerWeek}×/week` : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 text-right max-w-28 truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo */}
            {plan.photoUrl && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <p className="px-4 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">Client Photo</p>
                <img src={plan.photoUrl} alt="Client" className="w-full max-h-64 object-cover" />
              </div>
            )}

            {/* AI Summary */}
            {plan.plan?.clientSummary && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> AI Assessment
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{plan.plan.clientSummary}</p>
              </div>
            )}
          </div>

          {/* Right: plan content */}
          <div className="col-span-2 space-y-4">
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
                  <div className="space-y-6">
                    {/* Key Insights */}
                    {plan.plan?.keyInsights?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500" /> Key Insights
                        </h3>
                        <ul className="space-y-2">
                          {plan.plan.keyInsights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2.5 bg-yellow-50 rounded-lg p-3 text-sm text-gray-800">
                              <span className="text-yellow-500 shrink-0">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Trainer Notes */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-brand-500" /> Trainer Notes
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        These notes will be included in the email sent to the client.
                      </p>
                      <Textarea
                        value={trainerNotes}
                        onChange={(e) => setTrainerNotes(e.target.value)}
                        placeholder="Add any personal notes, extra guidance, check-in schedule, or anything specific for this client..."
                        rows={8}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Review the plan, add your notes, and send it to <span className="font-medium text-gray-800">{plan.clientEmail}</span>
              </p>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button variant="secondary" onClick={handleSave} loading={saving} size="sm">
                  <Save className="w-4 h-4" /> Save Draft
                </Button>
                <Button onClick={handleSend} loading={sending} variant="success" size="sm">
                  <Send className="w-4 h-4" /> Send to Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revision Modal */}
      <Modal open={revisionModal} onClose={() => setRevisionModal(false)} title="Request Plan Revision">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tell the AI what to change or improve. It will regenerate the full plan with your additional guidance.
          </p>
          <Textarea
            label="Additional context for the AI"
            value={revisionContext}
            onChange={(e) => setRevisionContext(e.target.value)}
            placeholder="e.g. Client mentioned they don't have time for meal prep, make meals simpler. Also increase protein targets — they responded well to high protein last time. Their knee injury is worse than described, avoid all squats."
            rows={6}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRevisionModal(false)}>Cancel</Button>
            <Button onClick={handleRegenerate} loading={regenerating} disabled={!revisionContext.trim()}>
              Regenerate Plan
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
