import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Flame, ChevronRight } from 'lucide-react';
import app from '../firebase/config';
import { getRiskLevel } from '../utils/streakUtils';

const db = getFirestore(app);

const RISK_STYLES = {
  red: { dot: 'bg-red-500', label: 'text-red-400', order: 0 },
  amber: { dot: 'bg-amber-500', label: 'text-amber-400', order: 1 },
  green: { dot: 'bg-emerald-500', label: 'text-emerald-400', order: 2 },
};

/** PT dashboard "Streaks" widget — every active client challenge, worst first. */
export default function StreaksWidget({ trainerId }) {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (!trainerId) return;
    const q = query(collection(db, 'challenges'), where('ptId', '==', trainerId), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [trainerId]);

  if (!challenges.length) return null;

  const withRisk = challenges
    .map((c) => ({
      ...c,
      risk: getRiskLevel({
        type: c.type,
        lastLoggedDate: c.lastLoggedDate,
        currentStreak: c.currentStreak || 0,
        timezone: c.timezone || 'Europe/London',
      }),
    }))
    .sort((a, b) => RISK_STYLES[a.risk].order - RISK_STYLES[b.risk].order);

  const openClient = (clientUid) => {
    window.location.hash = `client-${clientUid}`;
    document.getElementById(`client-${clientUid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
      <p className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
        <Flame className="w-3.5 h-3.5 text-amber-400" /> Streaks
      </p>
      <div className="space-y-1.5">
        {withRisk.map((c) => (
          <button
            key={c.id}
            onClick={() => openClient(c.clientId)}
            className="w-full flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 hover:border-slate-700 transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_STYLES[c.risk].dot}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {c.clientName || 'Client'} <span className="text-slate-500 font-normal">— {c.title}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {c.lastLoggedDate ? `Last logged ${c.lastLoggedDate}` : 'Never logged'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-bold flex items-center gap-1 ${RISK_STYLES[c.risk].label}`}>
                <Flame className="w-3.5 h-3.5" />{c.currentStreak || 0}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
