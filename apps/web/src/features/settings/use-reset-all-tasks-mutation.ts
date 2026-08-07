import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resetAllTasks } from '@/features/tasks/api';
import { useTranslation } from '@/lib/i18n/use-translation';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';

export function useResetAllTasksMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: resetAllTasks,
    onSuccess: ({ deletedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      toast.success(t('settings.resetSuccessMessage', { count: deletedCount }));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error));
    },
  });
}
