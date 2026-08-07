import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { submitProgress } from '@/features/tasks/submit-progress';
import type { ProgressResult, TaskOccurrence } from '@/features/tasks/types';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { useTranslation } from '@/lib/i18n/use-translation';

interface ProgressVars {
  taskId: string;
  date: string;
}

function applyResult(
  occurrence: TaskOccurrence,
  result: ProgressResult,
): TaskOccurrence {
  return {
    ...occurrence,
    currentValue: result.currentValue,
    targetValue: result.targetValue,
    completed: result.completed,
  };
}

/**
 * Optimistic additive increment: bumps `currentValue` (clamped to
 * `[0, targetValue]`, mirroring the server's own clamp) immediately, then
 * *overwrites* the cache with whatever the server actually reconciled to —
 * never trusts the optimistic value once the real response has arrived.
 */
export function useIncrementProgressMutation(occurrencesQueryKey: QueryKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, date, delta }: ProgressVars & { delta: number }) =>
      submitProgress(taskId, date, { delta }),

    onMutate: async ({ taskId, delta }) => {
      await queryClient.cancelQueries({ queryKey: occurrencesQueryKey });
      const previous =
        queryClient.getQueryData<TaskOccurrence[]>(occurrencesQueryKey);
      queryClient.setQueryData<TaskOccurrence[]>(occurrencesQueryKey, (old) =>
        old?.map((occurrence) => {
          if (occurrence.taskId !== taskId) return occurrence;
          const target = occurrence.targetValue ?? Infinity;
          const next = Math.min(
            target,
            Math.max(0, (occurrence.currentValue ?? 0) + delta),
          );
          return { ...occurrence, currentValue: next };
        }),
      );
      return { previous };
    },

    onSuccess: (result, { taskId }) => {
      queryClient.setQueryData<TaskOccurrence[]>(occurrencesQueryKey, (old) =>
        old?.map((occurrence) =>
          occurrence.taskId === taskId
            ? applyResult(occurrence, result)
            : occurrence,
        ),
      );
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(occurrencesQueryKey, context.previous);
      }
      toast.error(resolveApiErrorMessage(error, 'task-mutation'));
    },

    onSettled: () => {
      // Prefix-invalidate: other mounted occurrence ranges (dashboard
      // consistency grid, calendar month) cover this date too.
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Absolute value correction: deliberately *not* optimistic (an absolute
 * `value` can make a completed occurrence un-complete), so the cache is only
 * ever touched once the server has reconciled the real state.
 */
export function useCorrectProgressValueMutation(occurrencesQueryKey: QueryKey) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ taskId, date, value }: ProgressVars & { value: number }) =>
      submitProgress(taskId, date, { value }),

    onSuccess: (result, { taskId }) => {
      const previous = queryClient
        .getQueryData<TaskOccurrence[]>(occurrencesQueryKey)
        ?.find((occurrence) => occurrence.taskId === taskId);

      queryClient.setQueryData<TaskOccurrence[]>(occurrencesQueryKey, (old) =>
        old?.map((occurrence) =>
          occurrence.taskId === taskId
            ? applyResult(occurrence, result)
            : occurrence,
        ),
      );

      if (previous?.completed && !result.completed) {
        toast.info(t('tasks.progressCorrectionReverted'));
      }

      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },

    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'task-mutation'));
    },
  });
}
