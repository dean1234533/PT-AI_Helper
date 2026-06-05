import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  LayoutDashboard, Users, ClipboardList, LogOut,
  Dumbbell, ChevronRight, Menu, X, Crown, Zap, MessageSquareHeart,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/plans', label: 'All Plans', icon: ClipboardList },
  { to: '/checkins', label: 'Check-ins', icon: MessageSquareHeart },
];

function useAnsweredCheckIns() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'checkIns'),
      where('trainerId', '==', user.uid),
      where('status', '==', 'answered')
    );
    const unsub = onSnapshot(q, (snap) => setCount(snap.size), (err) => console.error('checkIn badge error:', err));
    return unsub;
  }, [user]);
  return count;
}

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const { isPro, isAdmin, plansThisMonth, plansRemaining, FREE_PLAN_LIMIT } = useSubscription();
  const answeredCount = useAnsweredCheckIns();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
    onClose?.();
  };

  const planLabel = isAdmin ? 'Admin' : isPro ? 'Pro' : 'Free';
  const planColor = isAdmin ? 'text-yellow-400' : isPro ? 'text-accent-400' : 'text-white/50';

  return (
    <div className="flex flex-col h-full bg-[#1e1b4b] w-64">
      {/* Logo + close button (mobile) */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shrink-0">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">PT AI Helper</p>
            <p className="text-white/50 text-xs">Trainer Dashboard</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Plan badge */}
      <div className="mx-4 mt-4 mb-1">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
          {isAdmin ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : isPro ? <Zap className="w-3.5 h-3.5 text-accent-400" /> : null}
          <span className={`text-xs font-semibold ${planColor}`}>{planLabel} Plan</span>
          {!isPro && !isAdmin && (
            <span className="ml-auto text-xs text-white/40">{plansThisMonth}/{FREE_PLAN_LIMIT} plans</span>
          )}
        </div>
        {!isPro && !isAdmin && plansRemaining === 0 && (
          <div className="mt-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
            <p className="text-orange-300 text-xs font-medium">Monthly limit reached</p>
            <button
              onClick={() => { navigate('/pricing'); onClose?.(); }}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold underline"
            >
              Upgrade to Pro →
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const showBadge = to === '/checkins' && answeredCount > 0;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {answeredCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Trainer info + logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.displayName?.[0]?.toUpperCase() || 'T'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Trainer'}</p>
            <p className="text-white/40 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        {isPro && !isAdmin && (
          <button
            onClick={() => { navigate('/manage-subscription'); onClose?.(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs transition-colors mb-1"
          >
            <Zap className="w-3.5 h-3.5" /> Manage subscription
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open to prevent layout shift
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex shrink-0">
        <Sidebar />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">PT AI Helper</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          {item.href ? (
            <a href={item.href} className="hover:text-gray-700 transition-colors">{item.label}</a>
          ) : (
            <span className="text-gray-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
