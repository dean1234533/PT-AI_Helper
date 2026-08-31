import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { registerPush } from '../hooks/usePushNotifications';
import toast from 'react-hot-toast';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// A persistent, always-reachable way to turn on notifications — unlike a
// one-time dismissible banner, this stays in the sidebar so there's never a
// point where a user who missed/dismissed the initial prompt has no path
// back to enabling them.
export default function NotificationSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState('unsupported'); // 'unsupported' | 'ios-not-installed' | 'denied' | 'default' | 'granted'
  const [working, setWorking] = useState(false);

  const refreshStatus = useCallback(() => {
    if (typeof Notification === 'undefined') {
      setStatus(isIOS() && !isStandalone() ? 'ios-not-installed' : 'unsupported');
      return;
    }
    setStatus(Notification.permission); // 'default' | 'granted' | 'denied'
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const enable = async () => {
    if (!user) return;
    setWorking(true);
    try {
      const perm = await Notification.requestPermission().catch(() => 'denied');
      if (perm === 'granted') {
        const token = await registerPush(user.uid);
        if (token) toast.success('Notifications enabled!');
        else toast.error('Enabled, but registration failed — try again.');
      }
      refreshStatus();
    } finally {
      setWorking(false);
    }
  };

  const baseClass = 'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all';

  if (status === 'granted') {
    return (
      <button
        onClick={enable}
        disabled={working}
        className={`${baseClass} text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10`}
        title="Notifications are on — click to refresh registration"
      >
        <BellRing className="w-4 h-4" /> Notifications on
      </button>
    );
  }

  if (status === 'denied') {
    return (
      <button
        onClick={() => toast('Notifications are blocked for this site — enable them in your browser/device Settings.', { icon: '🔕' })}
        className={`${baseClass} text-[#a5a5aa] hover:text-white hover:bg-white/5`}
      >
        <BellOff className="w-4 h-4" /> Notifications blocked
      </button>
    );
  }

  if (status === 'ios-not-installed') {
    return (
      <button
        onClick={() => toast('Add DB\'s Workouts to your Home Screen first — iOS only supports notifications for installed apps.', { icon: '📲' })}
        className={`${baseClass} text-[#a5a5aa] hover:text-white hover:bg-white/5`}
      >
        <Bell className="w-4 h-4" /> Enable notifications
      </button>
    );
  }

  if (status === 'unsupported') {
    return null;
  }

  return (
    <button
      onClick={enable}
      disabled={working}
      className={`${baseClass} text-[#a5a5aa] hover:text-white hover:bg-white/5 disabled:opacity-50`}
    >
      <Bell className="w-4 h-4" /> {working ? 'Enabling…' : 'Enable notifications'}
    </button>
  );
}
