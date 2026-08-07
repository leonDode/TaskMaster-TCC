import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthStore } from '@/stores/auth-store';

export function AuthCallbackPage() {
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'loading') return;
    navigate(status === 'authenticated' ? '/' : '/login', { replace: true });
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState label="Signing you in…" />
    </div>
  );
}
