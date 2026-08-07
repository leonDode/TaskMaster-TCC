import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { submitChallengeTaskProgress } from '@/features/challenges/api';
import type { ChallengeTaskProgress } from '@/features/challenges/types';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { queryKeys } from '@/lib/query-keys';

/**
 * Delta-only, additive optimism (no clamp — a challenge task has no cap).
 * On error, rolls back to the pre-mutation snapshot and surfaces the
 * "outside the challenge window" copy for the 400 case (started/ended are
 * not distinguished — the API itself uses one generic message for both).
 */
export function useIncrementChallengeProgressMutation(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  const progressKey = queryKeys.myProgress(groupId, challengeId);

  return useMutation({
    mutationFn: ({ taskId, delta }: { taskId: string; delta: number }) =>
      submitChallengeTaskProgress(groupId, challengeId, taskId, delta),

    onMutate: async ({ taskId, delta }) => {
      await queryClient.cancelQueries({ queryKey: progressKey });
      const previous =
        queryClient.getQueryData<ChallengeTaskProgress[]>(progressKey);
      queryClient.setQueryData<ChallengeTaskProgress[]>(progressKey, (old) =>
        old?.map((p) =>
          p.challengeTaskId === taskId
            ? { ...p, valueToday: (p.valueToday ?? 0) + delta }
            : p,
        ),
      );
      return { previous };
    },

    onSuccess: (result, { taskId }) => {
      queryClient.setQueryData<ChallengeTaskProgress[]>(progressKey, (old) =>
        old?.map((p) =>
          p.challengeTaskId === taskId
            ? {
                ...p,
                valueToday: result.currentValue,
                targetValue: result.targetValue,
              }
            : p,
        ),
      );
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(progressKey, context.previous);
      }
      toast.error(resolveApiErrorMessage(error, 'challenge-progress'));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: progressKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaderboard(groupId, challengeId),
      });
    },
  });
}
