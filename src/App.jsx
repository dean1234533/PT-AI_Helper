import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { GeminiProvider } from './contexts/GeminiContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ApiKeySetup from './pages/ApiKeySetup';
import ProfileSetup from './pages/ProfileSetup';
import BodyAnalysis from './pages/BodyAnalysis';
import Dashboard from './pages/Dashboard';
import MyPlan from './pages/MyPlan';
import CheckIn from './pages/CheckIn';
import Clients from './pages/Clients';
import PublicCheckIn from './pages/PublicCheckIn';
import Layout from './components/Layout';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/checkin/:id" element={<PublicCheckIn />} />

      {/* Protected Setup/Onboarding Routes */}
      <Route
        path="/setup/api-key"
        element={
          <ProtectedRoute>
            <ApiKeySetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/profile"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <ProtectedRoute>
            <Layout><BodyAnalysis /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected Main App Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <Layout><MyPlan /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkin"
        element={
          <ProtectedRoute>
            <Layout><CheckIn /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <GeminiProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontSize: '14px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          />
        </GeminiProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
