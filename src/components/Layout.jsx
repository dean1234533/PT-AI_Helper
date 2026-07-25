import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CheckSquare, User, Users,
  LogOut, Menu, X, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTrainerBranding } from '../hooks/useTrainerBranding';
import { applyBrandColor } from '../utils/color';
import toast from 'react-hot-toast';
import AIChat from './AIChat';
import InstallBanner from './InstallBanner';
import WorkoutReminder from './WorkoutReminder';

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
    <div className="flex flex-col h-full w-64 bg-dark-800 border-r border-white/5">
      {/* Logo */}
      <div className="p-5 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={brandLogo || '/logo.png'} alt={brandName || "DB's Workouts"} className="w-10 h-10 rounded-xl object-contain shrink-0" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">{brandName || "DB's Workouts"}</p>
            <p className="text-white/40 text-xs">Personal Trainer</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {[...navItems, ...(showClientsNav ? adminNavItems : [])].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600/25 text-brand-300 shadow-inner-glow'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.displayName || 'Athlete'}
            </p>
            <p className="text-white/35 text-xs truncate">{user?.email}</p>
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
          href="https://dbworkouts.co.uk/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 text-xs transition-all"
        >
          Privacy Policy
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 text-sm transition-all"
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
        <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-dark-800 border-b border-white/8 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/8 transition-colors text-white/60 hover:text-white"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div />
        </div>

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-white/8 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={brandLogo || '/logo.png'} alt={brandName || "DB's Workouts"} className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-white text-sm">{brandName || "DB's Workouts"}</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors text-white/50 hover:text-white"
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
            and the floating chat button otherwise overlaps its short content. */}
        {location.pathname !== '/clients' && (
          <>
            <WorkoutReminder />
            <AIChat />
          </>
        )}
        <InstallBanner />
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