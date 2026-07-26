import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { registerPush } from '../hooks/usePushNotifications';
import { X, Bell } from 'lucide-react';

// Generic, page-agnostic push opt-in — used on pages (like /clients) where
// WorkoutReminder (which otherwise owns the permission prompt + token
// registration) doesn't mount, so those users would never be asked and
// would never get a token registered at all.
const PERM_KEY = 'dbsai_notif_perm_asked';

export default function PushNotificationSetup() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!user || typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      registerPush(user.uid);
    } else if (Notification.permission !== 'denied' && !localStorage.getItem(PERM_KEY)) {
      setShowBanner(true);
    }
  }, [user]);

  const enable = async () => {
    setShowBanner(false);
    localStorage.setItem(PERM_KEY, '1');
    const perm = await Notification.requestPermission().catch(() => 'denied');
    if (perm === 'granted' && user) registerPush(user.uid);
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(PERM_KEY, '1');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center gap-2 pt-2 px-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg animate-slide-down">
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10">
          <div className="absolute inset-0 bg-slate-800/95 backdrop-blur-md" />
          <div className="relative flex items-center gap-3 px-4 py-3 pr-3">
            <Bell className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <p className="flex-1 text-white/80 text-xs leading-snug">
              Enable notifications to hear instantly about client signups, check-ins, and meal requests.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={dismiss}
                className="px-2.5 py-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={enable}
                className="px-3 py-1 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
              >
                Enable
              </button>
            </div>
            <button
              onClick={dismiss}
              className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/70"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
