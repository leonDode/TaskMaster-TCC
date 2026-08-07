import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { toggleOccurrence } from '@/features/occurrences/toggle-occurrence';
import type { TaskOccurrence } from '@/features/tasks/types';
import { ApiError } from '@/lib/api-error';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';

interface ToggleOccurrenceVars {
  taskId: string;
  date: string;
  checked: boolean;
}

/**
 * Optimistically flips `completed` on the occurrence in the given query's
 * cache, rolls back on error, and reconciles with the server on settle. A
 * 409 (already in that state — a race with another tab) is treated as
 * success and just refetched quietly instead of shown as an error.
 */
export function useToggleOccurrenceMutation(occurrencesQueryKey: QueryKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, date, checked }: ToggleOccurrenceVars) =>
      toggleOccurrence(taskId, date, checked),

    onMutate: async ({ taskId, checked }) => {
      await queryClient.cancelQueries({ queryKey: occurrencesQueryKey });
      const previous =
        queryClient.getQueryData<TaskOccurrence[]>(occurrencesQueryKey);
      queryClient.setQueryData<TaskOccurrence[]>(occurrencesQueryKey, (old) =>
        old?.map((occurrence) =>
          occurrence.taskId === taskId
            ? { ...occurrence, completed: checked }
            : occurrence,
        ),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(occurrencesQueryKey, context.previous);
      }
      if (error instanceof ApiError && error.statusCode === 409) {
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'task-occurrence-complete'));
    },

    onSettled: () => {
      // Prefix-invalidate every occurrence range, not just the caller's slice:
      // other mounted views (the dashboard's 12-week consistency grid, the
      // calendar's month grid) cover this date too and would go stale.
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
