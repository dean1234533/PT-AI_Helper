import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CheckSquare, User, Users,
  LogOut, Menu, X, ArrowLeft, ExternalLink, CreditCard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTrainerBranding } from '../hooks/useTrainerBranding';
import { applyBrandColor } from '../utils/color';
import toast from 'react-hot-toast';
import AIChat from './AIChat';
import InstallBanner from './InstallBanner';
import WorkoutReminder from './WorkoutReminder';
import PushNotificationSetup from './PushNotificationSetup';

const WHATSAPP_URL = 'https://wa.me/447752300937?text=Hi%2C%20I%20need%20help%20with%20the%20DB%27s%20Workouts%20app';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/plan',      label: 'My Plan',    icon: ClipboardList },
  { to: '/checkin',   label: 'Check-ins',  icon: CheckSquare },
  { to: '/profile',   label: 'My Profile', icon: User },
];

const adminNavItems = [
  { to: '/clients',   label: 'Clients',    icon: Users },
];

function Sidebar({ onClose, brandName, brandLogo }) {
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const showClientsNav = isAdmin || !profile?.trainerId;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
    onClose?.();
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="app-sidebar premium-sidebar flex flex-col h-full w-[280px] border-r">
      {/* Logo */}
      <div className="sidebar-brand px-5 h-[104px] flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="sidebar-brand-mark">
            <img src={brandLogo || '/logo.png'} alt={brandName || "DB's Workouts"} className="w-10 h-10 object-contain shrink-0" />
            <span className="sidebar-brand-status" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight truncate">{brandName || "DB's Workouts"}</p>
            <p className="sidebar-brand-label">Private coaching</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="w-10 h-10 rounded-xl flex items-center justify-center text-[#b4b4b8] hover:text-white hover:bg-white/10 transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-navigation flex-1 px-4 py-7 space-y-1.5 overflow-y-auto">
        <p className="sidebar-section-label">Training room</p>
        {[...navItems, ...(showClientsNav ? adminNavItems : [])].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-link group ${isActive ? 'is-active' : ''}`}
          >
            <span className="sidebar-active-rail" />
            <span className="app-nav-icon">
              <Icon className="w-4 h-4 shrink-0" />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="sidebar-footer p-4">
        <div className="sidebar-account flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl">
          <div className="sidebar-avatar">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.displayName || 'Athlete'}
            </p>
            <p className="text-[#8d8d92] text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#25D366]/70 hover:text-[#25D366] hover:bg-[#25D366]/10 text-sm transition-all mb-1"
        >
          {/* WhatsApp SVG icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Help & Support
        </a>
        <a
          href="https://dbworkouts.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#a5a5aa] hover:text-white hover:bg-white/5 text-sm transition-all"
        >
          <ExternalLink className="w-4 h-4" /> Website home
        </a>
        <a
          href="/app-home#pricing"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#a5a5aa] hover:text-white hover:bg-white/5 text-sm transition-all"
        >
          <CreditCard className="w-4 h-4" /> Membership & pricing
        </a>
        <a
          href="https://dbworkouts.co.uk/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#8d8d92] hover:text-white hover:bg-white/5 text-xs transition-all"
        >
          Privacy Policy
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#a5a5aa] hover:text-white hover:bg-white/10 text-sm transition-all"
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
  const navigate = useNavigate();
  const { brandName, brandColor, brandLogoBase64 } = useTrainerBranding();
  const brandLogo = brandLogoBase64 || null; // stored as a full data: URI (see ProfileSetup's logo upload)
  const currentPage = [...navItems, ...adminNavItems].find((item) => item.to === location.pathname)?.label || 'Coaching';

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.classList.add('sidebar-open');
    else document.body.classList.remove('sidebar-open');
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  useEffect(() => {
    applyBrandColor(brandColor);
    return () => applyBrandColor(null);
  }, [brandColor]);

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <Sidebar brandName={brandName} brandLogo={brandLogo} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative animate-slide-left">
            <Sidebar onClose={() => setSidebarOpen(false)} brandName={brandName} brandLogo={brandLogo} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="app-topbar premium-desktop-topbar hidden lg:flex items-center justify-between px-8 h-[72px] border-b shrink-0">
          <div className="desktop-page-identity">
            <span className="desktop-page-marker" />
            <div>
              <span>DB'S WORKOUTS</span>
              <strong>{currentPage}</strong>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="premium-nav-control premium-back-control" title="Go back">
            <ArrowLeft className="w-4 h-4" /><span>Back</span>
          </button>
        </div>

        {/* Mobile top bar */}
        <div className="app-topbar premium-mobile-topbar lg:hidden flex items-center justify-between px-4 border-b shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="premium-nav-control"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="mobile-brand">
            <span className="mobile-brand-mark"><img src={brandLogo || '/logo.png'} alt={brandName || "DB's Workouts"} /></span>
            <span className="mobile-brand-copy"><strong>{brandName || "DB's Workouts"}</strong><small>{currentPage}</small></span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="premium-nav-control"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {/* The AI coach chat + workout reminder are personal-fitness features —
            they don't belong on the trainer's client-management admin page,
            and the floating chat button otherwise overlaps its short content.
            WorkoutReminder also owns push-permission request + token
            registration for every other page, so /clients needs its own
            generic opt-in or the trainer would never get a token at all. */}
        {location.pathname !== '/clients' ? (
          <>
            <WorkoutReminder />
            <AIChat />
          </>
        ) : (
          <PushNotificationSetup />
        )}
        <InstallBanner />
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-5 justify-between mb-8 pb-6 border-b border-[#ded9d1]">
      <div>
        <p className="page-kicker mb-2">Personal coaching</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#181719] tracking-[-.045em]">{title}</h1>
        {subtitle && <p className="text-[#77716a] mt-2 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
