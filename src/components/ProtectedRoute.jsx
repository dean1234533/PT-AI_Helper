import { useAuth } from '../contexts/AuthContext';
import { GEMINI_KEY_STORAGE } from '../contexts/GeminiContext';
import { useProfile } from '../hooks/useProfile';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // If on a setup route, let them through regardless
  const setupRoutes = ['/setup/api-key', '/setup/profile', '/complete-payment'];
  if (setupRoutes.includes(location.pathname)) return children;

  if (profileLoading) return null;

  // Admin uses built-in API keys — skip Gemini key requirement
  const isAdmin = user.email === import.meta.env.VITE_ADMIN_EMAIL;
  // Clients invited by a trainer share the server-side AI cascade — no personal key needed
  const isManagedClient = Boolean(profile?.trainerId);
  if (isAdmin || isManagedClient) return children;

  // Signed up for Personal/PT Pro but never finished Stripe Checkout (or the
  // subscription has since lapsed) — block app access instead of silently
  // letting an unpaid account through. Accounts that never went through the
  // paid-plan signup flow (pendingPlan never set) are unaffected.
  if (profile?.pendingPlan && profile?.subscriptionStatus !== 'active') {
    return <Navigate to="/complete-payment" replace />;
  }

  // Regular users must have a Gemini key
  const geminiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!geminiKey) return <Navigate to="/setup/api-key" replace />;

  return children;
}
