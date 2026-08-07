import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addChallengeTask,
  completeChallengeTask,
  createChallenge,
  deleteChallenge,
  removeChallengeTask,
  uncompleteChallengeTask,
  updateChallenge,
  updateChallengeTask,
} from '@/features/challenges/api';
import type {
  ChallengeTaskProgress,
  CreateChallengeTaskInput,
  UpdateChallengeInput,
} from '@/features/challenges/types';
import { ApiError } from '@/lib/api-error';
import en from '@/lib/i18n/dictionaries/en';
import ptBR from '@/lib/i18n/dictionaries/pt-BR';
import { translate } from '@/lib/i18n/translate';
import { queryKeys } from '@/lib/query-keys';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { useLocaleStore } from '@/stores/locale-store';

const dictionaries = { en, 'pt-BR': ptBR };

function tChallenges(key: string): string {
  const challenges = dictionaries[useLocaleStore.getState().locale].challenges;
  return translate(challenges, key);
}

function invalidateChallengeLists(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['groups', groupId, 'challenges'],
  });
}

export function useCreateChallengeMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createChallenge>[1]) =>
      createChallenge(groupId, input),
    onSuccess: () => {
      invalidateChallengeLists(queryClient, groupId);
      toast.success(tChallenges('challengeCreatedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useUpdateChallengeMutation(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateChallengeInput) =>
      updateChallenge(groupId, challengeId, input),
    onSuccess: () => {
      invalidateChallengeLists(queryClient, groupId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.challenge(groupId, challengeId),
      });
      toast.success(tChallenges('challengeUpdatedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useDeleteChallengeMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => deleteChallenge(groupId, challengeId),
    onSuccess: () => {
      invalidateChallengeLists(queryClient, groupId);
      toast.success(tChallenges('challengeDeletedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useAddChallengeTaskMutation(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChallengeTaskInput) =>
      addChallengeTask(groupId, challengeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challenge(groupId, challengeId),
      });
      toast.success(tChallenges('taskAddedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useUpdateChallengeTaskMutation(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: Partial<CreateChallengeTaskInput>;
    }) => updateChallengeTask(groupId, challengeId, taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challenge(groupId, challengeId),
      });
      toast.success(tChallenges('taskUpdatedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useRemoveChallengeTaskMutation(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      removeChallengeTask(groupId, challengeId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challenge(groupId, challengeId),
      });
      toast.success(tChallenges('taskRemovedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'challenge-mutation'));
    },
  });
}

export function useToggleChallengeTaskCompletion(
  groupId: string,
  challengeId: string,
) {
  const queryClient = useQueryClient();
  const progressKey = queryKeys.myProgress(groupId, challengeId);

  return useMutation({
    mutationFn: ({ taskId, checked }: { taskId: string; checked: boolean }) =>
      checked
        ? completeChallengeTask(groupId, challengeId, taskId)
        : uncompleteChallengeTask(groupId, challengeId, taskId),

    onMutate: async ({ taskId, checked }) => {
      await queryClient.cancelQueries({ queryKey: progressKey });
      const previous =
        queryClient.getQueryData<ChallengeTaskProgress[]>(progressKey);
      queryClient.setQueryData<ChallengeTaskProgress[]>(progressKey, (old) =>
        old?.map((p) =>
          p.challengeTaskId === taskId
            ? {
                ...p,
                completedToday: checked,
                totalCompletions:
                  p.totalCompletions +
                  (checked ? 1 : p.completedToday ? -1 : 0),
              }
            : p,
        ),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(progressKey, context.previous);
      }
      if (error instanceof ApiError && error.statusCode === 409) {
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'challenge-task-complete'));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: progressKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaderboard(groupId, challengeId),
      });
    },
  });
}
