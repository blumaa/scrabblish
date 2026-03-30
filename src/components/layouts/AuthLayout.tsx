import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../atoms/Spinner';

export function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
