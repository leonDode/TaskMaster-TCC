import { Navigate, Outlet } from 'react-router';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
