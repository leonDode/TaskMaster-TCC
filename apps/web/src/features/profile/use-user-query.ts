import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/features/profile/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';

export function useUserQuery() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    enabled: status === 'authenticated',
  });
}
