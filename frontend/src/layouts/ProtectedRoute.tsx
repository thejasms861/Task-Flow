import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function ProtectedRoute() {
  const { user, isLoading, accessToken } = useAuthStore();
  if (isLoading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>;
  if (!accessToken || !user) return <Navigate to='/login' replace />;
  return <Outlet />;
}
