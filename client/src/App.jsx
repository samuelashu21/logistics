import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import PrivateRoute from './components/common/PrivateRoute.jsx';
import Layout from './components/layout/Layout.jsx';

// Auth pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

// Protected pages
import DashboardPage from './pages/DashboardPage.jsx';
import VehicleListPage from './pages/VehicleListPage.jsx';
import VehicleDetailPage from './pages/VehicleDetailPage.jsx';
import DriverListPage from './pages/DriverListPage.jsx';
import DriverDetailPage from './pages/DriverDetailPage.jsx';
import OrderListPage from './pages/OrderListPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import AdvertisementListPage from './pages/AdvertisementListPage.jsx';
import AdvertisementDetailPage from './pages/AdvertisementDetailPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import TrackingPage from './pages/TrackingPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Protected routes wrapped in Layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vehicles" element={<VehicleListPage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="/orders" element={<OrderListPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/advertisements" element={<AdvertisementListPage />} />
              <Route path="/advertisements/:id" element={<AdvertisementDetailPage />} />
              <Route path="/drivers/:id" element={<DriverDetailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin/Owner routes */}
          <Route element={<PrivateRoute roles={['admin', 'owner']} />}>
            <Route element={<Layout />}>
              <Route path="/drivers" element={<DriverListPage />} />
              <Route path="/drivers/new" element={<DriverDetailPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<PrivateRoute roles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
