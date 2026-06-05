import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquareHeart, Plus, Clock, CheckCircle2, Video,
  Calendar, Bell, Send, ChevronDown, RefreshCw, Users,
} from 'lucide-react';
import Layout, { PageHeader } from '../components/Layout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { useClients } from '../hooks/useClients';
import { usePlans } from '../hooks/usePlans';
import { useCheckIns, useCheckInSchedules } from '../hooks/useCheckIns';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:         { label: 'Sending…',        color: 'bg-gray-100 text-gray-600' },
  sent:            { label: 'Awaiting Reply',   color: 'bg-yellow-100 text-yellow-800' },
  answered:        { label: 'Answered',         color: 'bg-blue-100 text-blue-800' },
  reviewed:        { label: 'Reviewed',         color: 'bg-brand-100 text-brand-700' },
  call_scheduled:  { label: 'Call Scheduled',   color: 'bg-purple-100 text-purple-800' },
  call_completed:  { label: 'Call Done',        color: 'bg-green-100 text-green-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function timeAgo(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function nextCheckInLabel(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return 'Due now';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

// ── Send Check-in Modal ────────────────────────────────────────────────────────
function SendCheckInModal({ open, onClose, clients, onSend }) {
  const { plans } = usePlans();
  const [form, setForm] = useState({ clientId: '', planId: '', extraContext: '' });
  const [sending, setSending] = useState(false);

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const clientPlans = plans.filter((p) => p.clientId === form.clientId);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSend = async () => {
    if (!form.clientId) { toast.error('Select a client'); return; }
    setSending(true);
    try {
      await onSend(form, selectedClient, clientPlans.find((p) => p.id === form.planId) || clientPlans[0]);
      onClose();
      setForm({ clientId: '', planId: '', extraContext: '' });
    } catch (err) {
      toast.error('Failed to send check-in');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Check-in to Client">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          The AI will generate personalised questions based on the client's plan and goals, then send them a check-in email.
        </p>
        <Select label="Client *" value={form.clientId} onChange={set('clientId')}>
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {form.clientId && clientPlans.length > 1 && (
          <Select label="Which plan to base this on?" value={form.planId} onChange={set('planId')}>
            <option value="">Most recent plan</option>
            {clientPlans.map((p) => <option key={p.id} value={p.id}>{p.questionnaire?.primaryGoal} — {timeAgo(p.createdAt)}</option>)}
          </Select>
        )}
        {form.clientId && clientPlans.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
            This client has no plans yet. The AI will ask general health & fitness questions.
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Extra context for the AI (optional)</label>
          <textarea
            value={form.extraContext}
            onChange={set('extraContext')}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="e.g. Client mentioned they had a bad week. Ask about stress and sleep. Focus on nutrition adherence."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} loading={sending} disabled={!form.clientId}>
            <Send className="w-4 h-4" /> Send Check-in
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({ open, onClose, clients, onSchedule }) {
  const { plans } = usePlans();
  const [form, setForm] = useState({ clientId: '', planId: '', frequency: 'weekly', startDate: '' });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const clientPlans = plans.filter((p) => p.clientId === form.clientId);

  const handleSave = async () => {
    if (!form.clientId || !form.frequency) { toast.error('Fill in all fields'); return; }
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.clientId);
      const plan = clientPlans.find((p) => p.id === form.planId) || clientPlans[0];
      const startDate = form.startDate ? new Date(form.startDate) : new Date(Date.now() + 7 * 86400000);
      await onSchedule({ clientId: form.clientId, clientName: client.name, clientEmail: client.email, planId: plan?.id || '', frequency: form.frequency, nextCheckInDate: startDate });
      toast.success('Check-in schedule created');
      onClose();
      setForm({ clientId: '', planId: '', frequency: 'weekly', startDate: '' });
    } catch {
      toast.error('Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Up Automated Check-ins">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Automatically send personalised check-in messages to a client on a set schedule.
        </p>
        <Select label="Client *" value={form.clientId} onChange={set('clientId')}>
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Frequency *" value={form.frequency} onChange={set('frequency')}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Monthly</option>
        </Select>
        <Input label="First check-in date" type="date" value={form.startDate} onChange={set('startDate')} hint="Defaults to 7 days from now if left blank" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.clientId}>
            <Calendar className="w-4 h-4" /> Save Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CheckIns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients } = useClients();
  const { checkIns, loading, createCheckIn, updateCheckIn } = useCheckIns();
  const { schedules, createSchedule, updateSchedule } = useCheckInSchedules();
  const [sendModal, setSendModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('checkins');

  const pendingAnswers = checkIns.filter((c) => c.status === 'answered').length;
  const dueSchedules = schedules.filter((s) => {
    if (!s.active || !s.nextCheckInDate) return false;
    const d = s.nextCheckInDate.toDate ? s.nextCheckInDate.toDate() : new Date(s.nextCheckInDate);
    return d <= new Date();
  });

  const handleSendCheckIn = async (form, client, plan) => {
    const checkInRef = await createCheckIn({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      planId: plan?.id || '',
      trainerName: user.displayName || 'Your Trainer',
      trainerEmail: user.email,
    });

    const planSummary = plan ? {
      goal: plan.questionnaire?.primaryGoal,
      fitnessLevel: plan.questionnaire?.fitnessLevel,
      dietaryStyle: plan.questionnaire?.dietaryStyle,
      dailyCalories: plan.plan?.nutritionPlan?.dailyCalories,
      workoutDays: plan.questionnaire?.workoutDaysPerWeek,
      keyRules: plan.plan?.nutritionPlan?.keyRules?.slice(0, 3),
    } : null;

    const res = await fetch('/api/send-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkInId: checkInRef.id,
        clientName: client.name,
        clientEmail: client.email,
        trainerName: user.displayName || 'Your Trainer',
        trainerEmail: user.email,
        planSummary,
        extraContext: form.extraContext,
        appUrl: window.location.origin,
      }),
    });

    if (!res.ok) throw new Error('Send failed');
    const { questions, greeting } = await res.json();

    await updateCheckIn(checkInRef.id, {
      questions,
      greeting,
      status: 'sent',
      sentAt: new Date(),
    });

    toast.success(`Check-in sent to ${client.name}`);
  };

  const handleProcessDue = async () => {
    if (dueSchedules.length === 0) { toast('No check-ins due right now'); return; }
    setProcessing(true);
    let sent = 0;
    for (const schedule of dueSchedules) {
      try {
        const client = clients.find((c) => c.id === schedule.clientId);
        if (!client) continue;
        await handleSendCheckIn({ extraContext: '' }, client, null);
        const freq = schedule.frequency === 'weekly' ? 7 : schedule.frequency === 'biweekly' ? 14 : 30;
        const next = new Date(Date.now() + freq * 86400000);
        await updateSchedule(schedule.id, { lastCheckInDate: new Date(), nextCheckInDate: next });
        sent++;
      } catch { /* skip failed ones */ }
    }
    toast.success(`Sent ${sent} scheduled check-in${sent !== 1 ? 's' : ''}`);
    setProcessing(false);
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full p-20"><LoadingSpinner size="lg" /></div></Layout>;
  }

  return (
    <Layout>
      <SEO title="Check-ins" noIndex />
      <div className="p-4 sm:p-8">
        <PageHeader
          title="Client Check-ins"
          subtitle="Monitor client progress and schedule video calls."
          action={
            <div className="flex flex-wrap gap-2">
              {dueSchedules.length > 0 && (
                <Button variant="secondary" onClick={handleProcessDue} loading={processing} size="sm">
                  <RefreshCw className="w-4 h-4" /> Send {dueSchedules.length} Due
                </Button>
              )}
              <Button variant="secondary" onClick={() => setScheduleModal(true)} size="sm">
                <Calendar className="w-4 h-4" /> Schedule
              </Button>
              <Button size="sm" onClick={() => setSendModal(true)}>
                <Plus className="w-4 h-4" /> Send Check-in
              </Button>
            </div>
          }
        />

        {/* Notification bar */}
        {pendingAnswers > 0 && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 text-sm">
                  {pendingAnswers} client{pendingAnswers !== 1 ? 's have' : ' has'} responded to their check-in
                </p>
                <p className="text-blue-700 text-xs mt-0.5">Review their answers before scheduling a video call</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setTab('checkins')} className="bg-blue-600 hover:bg-blue-700">
              Review Now
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {[['checkins', 'Check-ins', checkIns.length], ['schedules', 'Schedules', schedules.length]].map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label} <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${tab === id ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Check-ins tab */}
        {tab === 'checkins' && (
          checkIns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquareHeart className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">No check-ins yet</p>
              <p className="text-gray-400 text-sm mb-5 max-w-xs">Send a check-in to a client and the AI will generate personalised questions based on their plan.</p>
              <Button onClick={() => setSendModal(true)} size="sm">
                <Plus className="w-4 h-4" /> Send First Check-in
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {checkIns.map((ci) => (
                <div
                  key={ci.id}
                  className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all cursor-pointer ${ci.status === 'answered' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
                  onClick={() => navigate(`/checkins/${ci.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ci.status === 'answered' ? 'bg-blue-100' : ci.status === 'call_scheduled' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      {ci.status === 'call_scheduled' || ci.status === 'call_completed'
                        ? <Video className={`w-5 h-5 ${ci.status === 'call_scheduled' ? 'text-purple-600' : 'text-green-600'}`} />
                        : ci.status === 'answered'
                        ? <Bell className="w-5 h-5 text-blue-600" />
                        : <MessageSquareHeart className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{ci.clientName}</p>
                        <StatusBadge status={ci.status} />
                        {ci.status === 'answered' && <span className="text-xs text-blue-600 font-medium animate-pulse">● New response</span>}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Sent {timeAgo(ci.sentAt || ci.createdAt)}
                        {ci.answeredAt && ` · Answered ${timeAgo(ci.answeredAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ci.status === 'answered' && (
                      <span className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-full">
                        Review & Schedule Call
                      </span>
                    )}
                    {ci.status === 'call_scheduled' && ci.videoCallLink && (
                      <a
                        href={ci.videoCallLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-purple-600 text-white font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" /> Join Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Schedules tab */}
        {tab === 'schedules' && (
          schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">No schedules yet</p>
              <p className="text-gray-400 text-sm mb-5 max-w-xs">Set up automatic check-ins so you never forget to follow up with a client.</p>
              <Button onClick={() => setScheduleModal(true)} size="sm">
                <Plus className="w-4 h-4" /> Create Schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => {
                const due = dueSchedules.find((d) => d.id === s.id);
                return (
                  <div key={s.id} className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${due ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${due ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        <Clock className={`w-5 h-5 ${due ? 'text-orange-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{s.clientName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.active ? s.frequency : 'Paused'}
                          </span>
                          {due && <span className="text-xs text-orange-600 font-semibold">Due now</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Next: {nextCheckInLabel(s.nextCheckInDate)}
                          {s.lastCheckInDate && ` · Last sent ${timeAgo(s.lastCheckInDate)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateSchedule(s.id, { active: !s.active })}
                      >
                        {s.active ? 'Pause' : 'Resume'}
                      </Button>
                      {due && (
                        <Button size="sm" onClick={() => handleProcessDue()}>
                          Send Now
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <SendCheckInModal open={sendModal} onClose={() => setSendModal(false)} clients={clients} onSend={handleSendCheckIn} />
      <ScheduleModal open={scheduleModal} onClose={() => setScheduleModal(false)} clients={clients} onSchedule={createSchedule} />
    </Layout>
  );
}
