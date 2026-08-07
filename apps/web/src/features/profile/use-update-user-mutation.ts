import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateMe } from '@/features/profile/api';
import { queryKeys } from '@/lib/query-keys';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me(), user);
      toast.success('Profile updated.');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error));
    },
  });
}
