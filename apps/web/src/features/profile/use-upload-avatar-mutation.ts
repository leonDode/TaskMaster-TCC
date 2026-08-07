import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadAvatar } from '@/features/profile/api';
import { useTranslation } from '@/lib/i18n/use-translation';
import { queryKeys } from '@/lib/query-keys';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: uploadAvatar,
    // The API returns the updated user with a cache-busted avatar URL, so
    // seeding the cache with it is enough for the new image to show up.
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me(), user);
      toast.success(t('profile.avatarUpdated'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error));
    },
  });
}
