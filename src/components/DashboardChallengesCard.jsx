import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Flame, ChevronRight } from 'lucide-react';
import app from '../firebase/config';
import { getLocalDateString } from '../utils/streakUtils';

const db = getFirestore(app);

/** Compact "Challenges" summary on the client's own Dashboard/Today's Briefing. */
export default function DashboardChallengesCard({ uid }) {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'challenges'), where('clientId', '==', uid), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [uid]);

  if (!challenges.length) return null;

  const today = getLocalDateString('Europe/London');

  return (
    <button
      onClick={() => navigate('/challenges')}
      className="w-full text-left bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md space-y-3 hover:border-slate-700 transition-all"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-amber-400" /> Challenges
        </h3>
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </div>
      <div className="space-y-2">
        {challenges.slice(0, 3).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-slate-300 truncate">{c.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />{c.currentStreak || 0}
              </span>
              {c.lastLoggedDate === today ? (
                <span className="text-[10px] text-emerald-400 font-semibold">Logged ✓</span>
              ) : (
                <span className="text-[10px] text-slate-500">Log today</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
