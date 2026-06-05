import { useState } from 'react';
import { ChevronDown, ChevronUp, Timer, TrendingUp, Zap, BedDouble } from 'lucide-react';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function WeeklyScheduleGrid({ schedule }) {
  return (
    <div className="overflow-x-auto">
    <div className="grid grid-cols-7 gap-1 min-w-[420px]">
      {dayOrder.map((day) => {
        const activity = schedule[day];
        return (
          <div key={day} className={`rounded-lg p-2 text-center ${activity ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50 border border-gray-100'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase">{day.slice(0, 3)}</p>
            <p className={`text-xs mt-1 leading-tight ${activity ? 'text-brand-700 font-medium' : 'text-gray-400'}`}>
              {activity || 'Rest'}
            </p>
          </div>
        );
      })}
    </div>
    </div>
  );
}

function ExerciseTable({ exercises }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <th className="pb-2 font-medium">Exercise</th>
            <th className="pb-2 font-medium text-center">Sets</th>
            <th className="pb-2 font-medium text-center">Reps</th>
            <th className="pb-2 font-medium text-center">Rest</th>
            <th className="pb-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {exercises.map((ex, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="py-2.5 pr-2 font-medium text-gray-800">{ex.exercise}</td>
              <td className="py-2.5 text-center text-gray-600">{ex.sets}</td>
              <td className="py-2.5 text-center text-gray-600">{ex.reps}</td>
              <td className="py-2.5 text-center text-gray-500 text-xs">{ex.rest}</td>
              <td className="py-2.5 text-gray-500 text-xs">{ex.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkoutAccordion({ workout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
            {workout.day?.slice(0, 3).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">{workout.name}</p>
            <p className="text-xs text-gray-400">{workout.day} · {workout.duration} min</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/30 space-y-4">
          {/* Warm-up */}
          {workout.warmup?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Warm-up
              </p>
              <ul className="space-y-1">
                {workout.warmup.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    {w.exercise} <span className="text-gray-400 text-xs">— {w.duration}</span>
                    {w.notes && <span className="text-gray-400 text-xs">({w.notes})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main workout */}
          {workout.mainWorkout?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Main Workout
              </p>
              <ExerciseTable exercises={workout.mainWorkout} />
            </div>
          )}

          {/* Cardio */}
          {workout.cardio && (
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
              <span className="font-semibold">Cardio: </span>{workout.cardio}
            </div>
          )}

          {/* Cool-down */}
          {workout.cooldown?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5" /> Cool-down
              </p>
              <ul className="space-y-1">
                {workout.cooldown.map((c, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {c.exercise} <span className="text-gray-400 text-xs">— {c.duration}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkoutViewer({ plan }) {
  const w = plan.workoutPlan;
  if (!w) return <p className="text-gray-500">No workout plan available.</p>;

  return (
    <div className="space-y-7">
      {/* Weekly Schedule */}
      {w.weeklySchedule && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Weekly Schedule</h3>
          <WeeklyScheduleGrid schedule={w.weeklySchedule} />
        </div>
      )}

      {/* Individual Workouts */}
      {w.workouts?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Workout Sessions</h3>
          <div className="space-y-2">
            {w.workouts.map((workout, i) => (
              <WorkoutAccordion key={i} workout={workout} />
            ))}
          </div>
        </div>
      )}

      {/* Progression Guide */}
      {w.progressionGuide && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <h3 className="font-semibold text-brand-900 text-sm flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" /> Progression Guide
          </h3>
          <p className="text-brand-800 text-sm leading-relaxed">{w.progressionGuide}</p>
        </div>
      )}

      {/* Recovery Tips */}
      {w.recoveryTips?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-blue-500" /> Recovery & Sleep Tips
          </h3>
          <ul className="space-y-2">
            {w.recoveryTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {w.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="font-semibold text-yellow-900 text-sm mb-1">Workout Notes</p>
          <p className="text-yellow-800 text-sm leading-relaxed">{w.notes}</p>
        </div>
      )}
    </div>
  );
}
