import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, query, where, onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Flame, Camera, Check, Loader2, Gift, Sparkles, Sunrise,
} from 'lucide-react';
import app, { auth, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useGemini } from '../contexts/GeminiContext';
import Layout, { PageHeader } from '../components/Layout';
import SEO from '../components/SEO';
import ChallengeHeatmap from '../components/ChallengeHeatmap';
import ConfettiBurst from '../components/ConfettiBurst';
import toast from 'react-hot-toast';
import { compressImageFile } from '../utils/imageCompress';
import { generateStuckForTodaySuggestion } from '../utils/challengeGeneration';
import { getLocalDateString, getNextReward } from '../utils/streakUtils';

const db = getFirestore(app);

function useChallengeLogs(challengeId) {
  const [logsByDate, setLogsByDate] = useState({});
  useEffect(() => {
    if (!challengeId) return;
    const unsub = onSnapshot(collection(db, 'challenges', challengeId, 'logs'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      setLogsByDate(map);
    });
    return unsub;
  }, [challengeId]);
  return logsByDate;
}

function ChallengeCard({ challenge, onCelebrate }) {
  const { callAI } = useGemini();
  const logsByDate = useChallengeLogs(challenge.id);
  const [numberValue, setNumberValue] = useState('');
  const [noteValue, setNoteValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stuckSuggestion, setStuckSuggestion] = useState('');
  const [stuckLoading, setStuckLoading] = useState(false);

  const today = getLocalDateString('Europe/London');
  const todayLog = logsByDate[today];
  const nextReward = getNextReward(challenge.rewards, challenge.currentStreak || 0);

  const submitLog = async (payload) => {
    setSubmitting(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/log-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ challengeId: challenge.id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to log today');
      if (data.meetsTarget === false) {
        const target = challenge.numberTarget ? `${challenge.numberTarget} ${challenge.unit || ''}`.trim() : 'target';
        toast(`Logged, but below your ${target} — it won't count toward your streak today.`, { icon: '📝', duration: 6000 });
      } else {
        toast.success('Logged ✓ — streak continues!');
      }
      if (data.newlyHitRewards?.length) {
        onCelebrate(data.newlyHitRewards[0]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log today');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const blob = await compressImageFile(file, { maxSize: 1280, targetBytes: 300 * 1024 });
      const storageRef = ref(storage, `challenges/${challenge.id}/${today}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const photoUrl = await getDownloadURL(storageRef);
      await submitLog({ photoUrl });
    } catch (err) {
      toast.error(err.message || 'Photo upload failed');
      setSubmitting(false);
    }
  };

  const askStuck = async () => {
    setStuckLoading(true);
    try {
      setStuckSuggestion(await generateStuckForTodaySuggestion(challenge, callAI));
    } catch (err) {
      toast.error(err.message || 'Could not get a suggestion');
    } finally {
      setStuckLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-100 text-base">{challenge.title}</p>
          {challenge.description && <p className="text-xs text-slate-500 mt-0.5">{challenge.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3 py-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span className="text-xl font-black text-amber-300">{challenge.currentStreak || 0}</span>
        </div>
      </div>

      {nextReward && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-violet-400" /> {nextReward.daysRemaining} days to: <span className="text-violet-300 font-semibold">{nextReward.title}</span>
        </p>
      )}

      {todayLog ? (
        todayLog.meetsTarget === false ? (
          <div className="flex items-center gap-2 bg-amber-950/20 border border-amber-900/30 rounded-xl px-3 py-2.5">
            <Check className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">
              Logged {todayLog.value}{challenge.unit ? ` ${challenge.unit}` : ''} — below your {challenge.numberTarget}{challenge.unit ? ` ${challenge.unit}` : ''} target, streak not counted today
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-3 py-2.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Logged ✓{todayLog.usedFreeze ? ' (freeze used)' : ''}</span>
          </div>
        )
      ) : challenge.logType === 'tick' ? (
        <button onClick={() => submitLog({})} disabled={submitting}
          className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Log today
        </button>
      ) : challenge.logType === 'number' ? (
        <div className="flex gap-2">
          <input type="number" value={numberValue} onChange={(e) => setNumberValue(e.target.value)}
            placeholder={`Target: ${challenge.numberTarget} ${challenge.unit || ''}`}
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-brand-500" />
          <button onClick={() => numberValue && submitLog({ value: Number(numberValue) })} disabled={submitting || !numberValue}
            className="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}
          </button>
        </div>
      ) : challenge.logType === 'note' ? (
        <div className="space-y-2">
          <textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} rows={2} placeholder="Quick note..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-brand-500 resize-none" />
          <button onClick={() => noteValue.trim() && submitLog({ note: noteValue.trim() })} disabled={submitting || !noteValue.trim()}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Log today'}
          </button>
        </div>
      ) : (
        <label className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} {submitting ? 'Uploading…' : 'Log with photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={submitting} />
        </label>
      )}

      {!todayLog && (
        <div>
          <button onClick={askStuck} disabled={stuckLoading} className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> {stuckLoading ? 'Thinking…' : 'Stuck for today?'}
          </button>
          {stuckSuggestion && <p className="text-[11px] text-brand-300 bg-brand-950/20 border border-brand-900/30 rounded-lg px-3 py-2 mt-2">{stuckSuggestion}</p>}
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Last 30 days</p>
        <ChallengeHeatmap logsByDate={logsByDate} />
      </div>
    </div>
  );
}

export default function MyChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'challenges'), where('clientId', '==', user.uid), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const celebrate = useCallback((reward) => {
    setCelebrating(reward);
    setTimeout(() => setCelebrating(null), 3200);
  }, []);

  return (
    <Layout>
      <SEO title="My Challenges" noIndex />
      {celebrating && <ConfettiBurst />}
      {celebrating && (
        <div className="fixed inset-x-4 top-6 z-[101] max-w-sm mx-auto bg-slate-900 border border-violet-700/50 rounded-2xl p-4 shadow-2xl text-center animate-fade-in-up">
          <p className="text-sm font-bold text-violet-300">🎉 You've earned: {celebrating.title}</p>
          <p className="text-xs text-slate-400 mt-1">Your PT has been notified.</p>
        </div>
      )}
      <div className="app-page space-y-6">
        <PageHeader title="My Challenges" subtitle="Build a streak, earn rewards your PT set for you." />
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Sunrise className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm">No active challenges yet — your trainer hasn't set one up.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {challenges.map((c) => <ChallengeCard key={c.id} challenge={c} onCelebrate={celebrate} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
