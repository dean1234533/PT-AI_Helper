import { useState, useEffect } from 'react';
import {
  getFirestore, collection, addDoc, updateDoc, doc, query, where, onSnapshot,
} from 'firebase/firestore';
import {
  Flame, Plus, Sparkles, Loader2, X, Trash2, Pause, Play, Check, Gift,
} from 'lucide-react';
import app from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { generateChallengeSuggestions } from '../utils/challengeGeneration';
import { getRiskLevel, getNextReward } from '../utils/streakUtils';

const db = getFirestore(app);

const TEMPLATES = [
  { title: '10k Steps Daily', description: 'Hit 10,000 steps every day.', type: 'daily', logType: 'number', numberTarget: 10000, unit: 'steps', freezesPerMonth: 2 },
  { title: '3 Workouts a Week', description: 'Complete at least 3 training sessions every week.', type: 'x_per_week', targetPerWeek: 3, logType: 'tick', freezesPerMonth: 0 },
  { title: '30-Day Mobility', description: '10 minutes of mobility work every day for 30 days.', type: 'daily', logType: 'tick', freezesPerMonth: 3 },
  { title: 'Drink 2L Water', description: 'Hit 2 litres of water daily.', type: 'daily', logType: 'number', numberTarget: 2000, unit: 'ml', freezesPerMonth: 2 },
  { title: 'No Takeaway Weekdays', description: 'No takeaway food Monday to Friday.', type: 'x_per_week', targetPerWeek: 5, logType: 'tick', freezesPerMonth: 0 },
];

const EMPTY_FORM = {
  title: '', description: '', type: 'daily', targetPerWeek: 3,
  logType: 'tick', numberTarget: '', unit: '', freezesPerMonth: 1,
  rewards: [{ atDay: 25, title: 'Free session', description: '' }],
};

function RiskBadge({ challenge }) {
  const risk = getRiskLevel({
    type: challenge.type,
    lastLoggedDate: challenge.lastLoggedDate,
    currentStreak: challenge.currentStreak || 0,
    timezone: challenge.timezone || 'Europe/London',
  });
  const styles = { red: 'bg-red-500/10 text-red-400 border-red-500/25', amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25', green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' };
  return <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${styles[risk]}`}>{risk}</span>;
}

function ChallengeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateReward = (idx, key, value) => {
    const rewards = [...form.rewards];
    rewards[idx] = { ...rewards[idx], [key]: value };
    update('rewards', rewards);
  };
  const addReward = () => update('rewards', [...form.rewards, { atDay: '', title: '', description: '' }]);
  const removeReward = (idx) => update('rewards', form.rewards.filter((_, i) => i !== idx));

  const submit = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (form.type === 'x_per_week' && (!form.targetPerWeek || form.targetPerWeek < 1)) { toast.error('Set a weekly target'); return; }
    if (form.logType === 'number' && !form.numberTarget) { toast.error('Set a number target'); return; }
    onSave(form);
  };

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Title</label>
          <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. 10k Steps Daily"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Description</label>
          <input value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Optional"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Type</label>
          <select value={form.type} onChange={(e) => update('type', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none">
            <option value="daily">Daily</option>
            <option value="x_per_week">X per week</option>
          </select>
        </div>
        {form.type === 'x_per_week' && (
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Times/week</label>
            <input type="number" min="1" max="7" value={form.targetPerWeek} onChange={(e) => update('targetPerWeek', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none" />
          </div>
        )}
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Log type</label>
          <select value={form.logType} onChange={(e) => update('logType', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none">
            <option value="tick">Tick</option>
            <option value="number">Number</option>
            <option value="note">Note</option>
            <option value="photo">Photo</option>
          </select>
        </div>
        {form.type === 'daily' && (
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Freezes/month</label>
            <input type="number" min="0" max="10" value={form.freezesPerMonth} onChange={(e) => update('freezesPerMonth', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none" />
          </div>
        )}
      </div>

      {form.logType === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Number target</label>
            <input type="number" value={form.numberTarget} onChange={(e) => update('numberTarget', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Unit</label>
            <input value={form.unit} onChange={(e) => update('unit', e.target.value)} placeholder="e.g. steps"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 outline-none" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Rewards</label>
        <div className="space-y-2">
          {form.rewards.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 shrink-0">At day</span>
              <input type="number" value={r.atDay} onChange={(e) => updateReward(i, 'atDay', Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none" />
              <input value={r.title} onChange={(e) => updateReward(i, 'title', e.target.value)} placeholder="Reward"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none" />
              <button onClick={() => removeReward(i)} className="text-slate-600 hover:text-red-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={addReward} className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold">+ Add reward</button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors">
          Cancel
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save Challenge
        </button>
      </div>
    </div>
  );
}

export default function ChallengesPanel({ clientUid, clientDocId, clientName, profile, analysis, callAI }) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Firestore can only verify a security rule for a LIST query using
    // fields the query itself filters on — filtering by clientId alone
    // isn't enough to prove the ptId-based read rule, even though the
    // trainer legitimately owns every matching doc, so the whole listener
    // gets rejected outright. Filtering on ptId too (which the rule
    // actually checks) makes it provable.
    const q = query(collection(db, 'challenges'), where('ptId', '==', user.uid), where('clientId', '==', clientUid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setChallenges(list);
    }, (err) => console.error('Challenges listener error:', err));
    return unsub;
  }, [clientUid, user]);

  const saveChallenge = async (form) => {
    setSaving(true);
    try {
      const rewards = form.rewards
        .filter((r) => r.atDay && r.title)
        .map((r) => ({ atDay: Number(r.atDay), title: r.title, description: r.description || '', claimed: false, claimedAt: null }));

      const payload = {
        ptId: user.uid,
        trainerName: user.displayName || 'Your trainer',
        ptEmail: user.email,
        clientId: clientUid,
        clientName: clientName || 'Client',
        title: form.title.trim(),
        description: form.description || '',
        type: form.type,
        targetPerWeek: form.type === 'x_per_week' ? Number(form.targetPerWeek) : null,
        logType: form.logType,
        numberTarget: form.logType === 'number' ? Number(form.numberTarget) : null,
        unit: form.logType === 'number' ? (form.unit || '') : null,
        freezesPerMonth: form.type === 'daily' ? Number(form.freezesPerMonth) || 0 : 0,
        status: 'active',
        rewards,
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        totalLogs: 0,
        freezesUsedThisMonth: 0,
        freezesResetMonth: null,
        currentWeekStart: null,
        currentWeekCount: 0,
        startDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };

      if (formInitial?.id) {
        // Editing settings only — never touch stats fields here.
        await updateDoc(doc(db, 'challenges', formInitial.id), {
          title: payload.title, description: payload.description, rewards: payload.rewards,
          freezesPerMonth: payload.freezesPerMonth, numberTarget: payload.numberTarget, unit: payload.unit,
        });
        toast.success('Challenge updated');
      } else {
        await addDoc(collection(db, 'challenges'), payload);
        toast.success('Challenge created');
      }
      setShowForm(false);
      setFormInitial(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save challenge');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (challengeId, status) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), { status });
    } catch (err) {
      toast.error(err.message || 'Failed to update challenge');
    }
  };

  const markRewardGiven = async (challenge, rewardIdx) => {
    const rewards = challenge.rewards.map((r, i) => i === rewardIdx ? { ...r, claimed: true, claimedAt: new Date().toISOString() } : r);
    try {
      await updateDoc(doc(db, 'challenges', challenge.id), { rewards });
      toast.success('Marked as given');
    } catch (err) {
      toast.error(err.message || 'Failed to update reward');
    }
  };

  const suggestWithAI = async () => {
    setSuggesting(true);
    try {
      const results = await generateChallengeSuggestions(profile, analysis, callAI);
      setSuggestions(Array.isArray(results) ? results : []);
    } catch (err) {
      toast.error(err.message || 'Could not generate suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  const useSuggestion = (s) => {
    setFormInitial({
      title: s.title || '', description: s.description || '', type: s.type || 'daily',
      targetPerWeek: s.targetPerWeek || 3, logType: s.logType || 'tick',
      numberTarget: s.numberTarget || '', unit: s.unit || '', freezesPerMonth: s.freezesPerMonth ?? 1,
      rewards: (s.rewards || []).length ? s.rewards.map((r) => ({ atDay: r.atDay, title: r.title, description: '' })) : EMPTY_FORM.rewards,
    });
    setSuggestions(null);
    setShowForm(true);
  };

  const useTemplate = (t) => {
    setFormInitial({ ...EMPTY_FORM, ...t, rewards: EMPTY_FORM.rewards });
    setShowForm(true);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          <Flame className="w-3.5 h-3.5 text-amber-400" /> Challenges
        </p>
        <div className="flex gap-2">
          <button onClick={suggestWithAI} disabled={suggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-violet-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50">
            {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Suggest with AI
          </button>
          <button onClick={() => { setFormInitial(null); setShowForm((v) => !v); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/25 text-brand-400 text-xs font-semibold rounded-xl transition-all">
            <Plus className="w-3.5 h-3.5" /> New challenge
          </button>
        </div>
      </div>

      {suggestions && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500">AI suggestions — pick one to edit and save:</p>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => useSuggestion(s)}
              className="w-full text-left bg-violet-950/20 border border-violet-900/30 rounded-xl p-3 hover:border-violet-700/40 transition-all">
              <p className="text-xs font-semibold text-violet-300">{s.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
            </button>
          ))}
          <button onClick={() => setSuggestions(null)} className="text-[10px] text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      {!showForm && !suggestions && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TEMPLATES.map((t) => (
            <button key={t.title} onClick={() => useTemplate(t)}
              className="shrink-0 px-3 py-1.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium rounded-xl transition-all whitespace-nowrap">
              {t.title}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <ChallengeForm
          initial={formInitial}
          saving={saving}
          onSave={saveChallenge}
          onCancel={() => { setShowForm(false); setFormInitial(null); }}
        />
      )}

      <div className="space-y-2">
        {challenges.length === 0 && !showForm && (
          <p className="text-xs text-slate-500">No challenges yet — pick a template or suggest one with AI.</p>
        )}
        {challenges.map((c) => {
          const next = getNextReward(c.rewards, c.currentStreak || 0);
          const unclaimedHit = (c.rewards || []).filter((r) => !r.claimed && (c.currentStreak || 0) >= r.atDay);
          return (
            <div key={c.id} className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-2 flex-wrap">
                    {c.title}
                    {c.status === 'active' && <RiskBadge challenge={c} />}
                    {c.status !== 'active' && <span className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-500 uppercase">{c.status}</span>}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    <Flame className="w-3 h-3 inline text-amber-500 -mt-0.5" /> {c.currentStreak || 0} day streak · longest {c.longestStreak || 0} · {c.totalLogs || 0} total logs
                    {next && ` · ${next.daysRemaining}d to ${next.title}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.status === 'active' ? (
                    <button onClick={() => setStatus(c.id, 'paused')} title="Pause" className="p-1.5 text-slate-500 hover:text-amber-400"><Pause className="w-3.5 h-3.5" /></button>
                  ) : c.status === 'paused' ? (
                    <button onClick={() => setStatus(c.id, 'active')} title="Resume" className="p-1.5 text-slate-500 hover:text-emerald-400"><Play className="w-3.5 h-3.5" /></button>
                  ) : null}
                  <button onClick={() => setStatus(c.id, 'archived')} title="Archive" className="p-1.5 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {unclaimedHit.length > 0 && (
                <div className="space-y-1.5">
                  {unclaimedHit.map((r, i) => {
                    const rewardIdx = c.rewards.findIndex((rr) => rr === r);
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 bg-amber-950/20 border border-amber-900/30 rounded-lg px-2.5 py-1.5">
                        <span className="text-[11px] text-amber-300 flex items-center gap-1.5"><Gift className="w-3 h-3" /> Earned: {r.title}</span>
                        <button onClick={() => markRewardGiven(c, rewardIdx)} className="text-[10px] font-semibold text-amber-400 hover:text-amber-300">Mark as given</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
