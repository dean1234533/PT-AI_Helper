import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Plans from './pages/Plans';
import NewPlan from './pages/NewPlan';
import ReviewPlan from './pages/ReviewPlan';
import PlanDetail from './pages/PlanDetail';
import ManageSubscription from './pages/ManageSubscription';
import Pricing from './pages/Pricing';
import CheckIns from './pages/CheckIns';
import CheckInDetail from './pages/CheckInDetail';
import ClientCheckIn from './pages/ClientCheckIn';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/:clientId" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
      <Route path="/plans/new" element={<ProtectedRoute><NewPlan /></ProtectedRoute>} />
      <Route path="/plans/:planId/review" element={<ProtectedRoute><ReviewPlan /></ProtectedRoute>} />
      <Route path="/plans/:planId" element={<ProtectedRoute><PlanDetail /></ProtectedRoute>} />
      <Route path="/manage-subscription" element={<ProtectedRoute><ManageSubscription /></ProtectedRoute>} />
      <Route path="/checkins" element={<ProtectedRoute><CheckIns /></ProtectedRoute>} />
      <Route path="/checkins/:checkInId" element={<ProtectedRoute><CheckInDetail /></ProtectedRoute>} />

      {/* Public — no auth required */}
      <Route path="/checkin/:checkInId" element={<ClientCheckIn />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: '14px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
            }}
          />
        </SubscriptionProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
