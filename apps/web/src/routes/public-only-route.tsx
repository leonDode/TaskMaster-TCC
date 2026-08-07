import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/auth-store';

export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
