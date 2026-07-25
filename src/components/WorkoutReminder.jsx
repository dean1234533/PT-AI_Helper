import { useEffect, useState, useRef, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { registerPush } from '../hooks/usePushNotifications';
import { X, Dumbbell, Flame, Bell } from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────
const TODAY_KEY = () => `dbsai_reminded_${new Date().toISOString().slice(0, 10)}`;
const PERM_KEY  = 'dbsai_notif_perm_asked';

// Motivational messages — randomised each time
const MESSAGES = [
  (name, focus) =>
    `Hey ${name}! Remember you have ${focus || 'a workout'} today. Do you want to hit your goals or do you want to be that person who lives with regrets?`,
  (name, focus) =>
    `${name}, ${focus || "today's session"} is waiting for you. Champions show up on the days they don't feel like it — be a champion.`,
  (name, focus) =>
    `Don't skip today, ${name}. Every rep you miss is a step away from the person you're trying to become. ${focus ? `Get that ${focus} done!` : 'Get it done!'}`,
  (name, focus) =>
    `${name} — you set this goal for a reason. ${focus || "Today's workout"} is how you honour that decision. No regrets, let's go!`,
  (name, focus) =>
    `Future you will thank you, ${name}. ${focus || 'This workout'} isn't just a session — it's a promise to yourself. Keep it.`,
  (name, focus) =>
    `One day you'll look back and be so glad you didn't quit, ${name}. Today is one of those days. ${focus || 'Time to work'}.`,
];

function pickMessage(name, focus) {
  const fn = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return fn(name, focus);
}

// Time helpers — ms until HH:MM today (returns 0 if already past)
function msUntil(hour, minute = 0) {
  const now = new Date();
  const t = new Date();
  t.setHours(hour, minute, 0, 0);
  return Math.max(0, t - now);
}

async function fireNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  const sw = await navigator.serviceWorker?.ready.catch(() => null);
  if (sw) {
    sw.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'workout-reminder',
      renotify: true,
    });
  } else {
    new Notification(title, { body, icon: '/icon-192.png' });
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function WorkoutReminder() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [banner, setBanner] = useState(null);   // { message, focus }
  const [permBanner, setPermBanner] = useState(false);
  const timersRef = useRef([]);

  const dismiss = useCallback(() => {
    localStorage.setItem(TODAY_KEY(), '1');
    setBanner(null);
  }, []);

  const requestPermAndSchedule = useCallback(async (name, focus) => {
    setPermBanner(false);
    localStorage.setItem(PERM_KEY, '1');
    const perm = await Notification.requestPermission().catch(() => 'denied');
    if (perm === 'granted') {
      scheduleReminders(name, focus);
      if (user?.uid) registerPush(user.uid);
    }
  }, [user]); // eslint-disable-line

  const scheduleReminders = useCallback((name, focus) => {
    // Clear any existing timers from this session
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Reminder times: 8 AM, 12:30 PM, 5:30 PM — skip if already past
    const slots = [[8, 0], [12, 30], [17, 30]];
    slots.forEach(([h, m]) => {
      const delay = msUntil(h, m);
      if (delay === 0) return;
      const id = setTimeout(() => {
        fireNotification("DB's Workouts — Workout Reminder", pickMessage(name, focus));
      }, delay);
      timersRef.current.push(id);
    });
  }, []);

  useEffect(() => {
    if (!user || !profile?.name) return;

    async function run() {
      if (Notification.permission === 'granted') registerPush(user.uid);

      // Already reminded today — don't show the banner again
      if (localStorage.getItem(TODAY_KEY())) {
        // Still reschedule browser notifications for the rest of the day
        if (Notification.permission === 'granted') {
          const plan = await loadTodayWorkout(user.uid);
          if (plan && !plan.isRestDay) scheduleReminders(profile.name, plan.focus);
        }
        return;
      }

      const todayPlan = await loadTodayWorkout(user.uid);
      if (!todayPlan || todayPlan.isRestDay) return;

      const message = pickMessage(profile.name, todayPlan.focus);
      setBanner({ message, focus: todayPlan.focus });

      // Browser notification
      if (Notification.permission === 'granted') {
        fireNotification("DB's Workouts — Workout Day!", message);
        scheduleReminders(profile.name, todayPlan.focus);
      } else if (
        Notification.permission !== 'denied' &&
        !localStorage.getItem(PERM_KEY)
      ) {
        // Show soft permission ask after a short delay
        setTimeout(() => setPermBanner(true), 3000);
      }
    }

    run();

    return () => timersRef.current.forEach(clearTimeout);
  }, [user, profile?.name, scheduleReminders]);

  if (!banner && !permBanner) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center gap-2 pt-2 px-3 pointer-events-none">
      {/* Main workout reminder banner */}
      {banner && (
        <div className="pointer-events-auto w-full max-w-lg animate-slide-down">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-violet-500/30">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-md" />
            {/* Animated fire stripe */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

            <div className="relative flex items-start gap-3 p-4 pr-10">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg mt-0.5">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Dumbbell className="w-3 h-3" /> Workout Day
                </p>
                <p className="text-white text-sm leading-snug">{banner.message}</p>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Permission ask banner */}
      {permBanner && (
        <div className="pointer-events-auto w-full max-w-lg animate-slide-down">
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <div className="absolute inset-0 bg-slate-800/95 backdrop-blur-md" />
            <div className="relative flex items-center gap-3 px-4 py-3 pr-3">
              <Bell className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <p className="flex-1 text-white/80 text-xs leading-snug">
                Enable notifications so DB's Workouts can remind you to train throughout the day.
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setPermBanner(false); localStorage.setItem(PERM_KEY, '1'); }}
                  className="px-2.5 py-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={() => requestPermAndSchedule(profile.name, banner?.focus)}
                  className="px-3 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  Enable
                </button>
              </div>
              <button
                onClick={() => { setPermBanner(false); localStorage.setItem(PERM_KEY, '1'); }}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Firestore helper ──────────────────────────────────────────────────────
async function loadTodayWorkout(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'current'));
    if (!snap.exists()) return null;
    const plan = snap.data();
    const days = plan.workoutPlan?.days;
    if (!Array.isArray(days) || !days.length) return null;

    // Match today's day name (Mon/Tue/etc or full name)
    const TODAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIdx = new Date().getDay(); // 0=Sun
    const todayName = TODAY_NAMES[todayIdx];

    const todayDay = days.find((d) => {
      const n = (d.dayName || '').toLowerCase();
      return n.startsWith(todayName.slice(0, 3));
    });

    if (!todayDay) {
      // Fallback: use day number if AI used Day 1-7 (Mon=1)
      const dayNum = todayIdx === 0 ? 7 : todayIdx; // Mon=1, Sun=7
      return days.find((d) => d.dayNumber === dayNum) || null;
    }
    return todayDay;
  } catch {
    return null;
  }
}
