import { useAuth } from '../contexts/AuthContext';
import { GEMINI_KEY_STORAGE } from '../contexts/GeminiContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // If on a setup route, let them through regardless
  const setupRoutes = ['/setup/api-key', '/setup/profile'];
  if (setupRoutes.includes(location.pathname)) return children;

  // Admin uses built-in API keys — skip Gemini key requirement
  const isAdmin = user.email === import.meta.env.VITE_ADMIN_EMAIL;
  if (isAdmin) return children;

  // Regular users must have a Gemini key
  // Use localStorage.getItem directly — GeminiContext stores the raw string (not JSON-encoded)
  const geminiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!geminiKey) return <Navigate to="/setup/api-key" replace />;

  return children;
}
