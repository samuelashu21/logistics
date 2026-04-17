import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

export default function PrivateRoute({ roles = [] }) {
  const { token, user, loading } = useAuth();
 
  if (loading && token) return <Spinner />;
  if (!token) return <Navigate to="/login" replace />;

  if (roles.length > 0) {
    if (!user) return <Spinner />;
    if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
} 

