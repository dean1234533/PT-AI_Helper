import { addDays, getLocalDateString } from '../utils/streakUtils';

/** Last-30-days calendar heatmap: logged (green) / frozen (blue) / missed (empty). */
export default function ChallengeHeatmap({ logsByDate, timezone = 'Europe/London' }) {
  const today = getLocalDateString(timezone);
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i)));

  return (
    <div className="grid grid-cols-10 gap-1">
      {days.map((date) => {
        const log = logsByDate[date];
        const cls = log
          ? (log.usedFreeze ? 'bg-blue-500/70' : 'bg-emerald-500/80')
          : date === today
            ? 'bg-slate-800 border border-dashed border-slate-600'
            : 'bg-slate-900 border border-slate-850';
        return <div key={date} title={date} className={`w-full aspect-square rounded-[3px] ${cls}`} />;
      })}
    </div>
  );
}
