import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIncrementChallengeProgressMutation } from '@/features/challenges/use-challenge-progress-mutation';
import type { ChallengeTaskProgress } from '@/features/challenges/types';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { createTestQueryClient } from '@/test/render';

const { submitChallengeTaskProgress } = vi.hoisted(() => ({
  submitChallengeTaskProgress: vi.fn(),
}));

vi.mock('@/features/challenges/api', () => ({
  submitChallengeTaskProgress,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const groupId = 'group-1';
const challengeId = 'challenge-1';
const initialProgress: ChallengeTaskProgress[] = [
  {
    challengeTaskId: 'task-1',
    title: 'Run',
    points: 0,
    completedToday: false,
    totalCompletions: 0,
    kind: 'QUANTITATIVE',
    targetValue: 10,
    unit: 'KM',
    valueToday: 2,
  },
];

describe('useIncrementChallengeProgressMutation', () => {
  it('rolls back the optimistic update and surfaces the challenge-window message on a 400', async () => {
    submitChallengeTaskProgress.mockRejectedValueOnce(
      new ApiError({ statusCode: 400, message: 'Fora da janela do desafio' }),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.myProgress(groupId, challengeId),
      initialProgress,
    );

    const { result } = renderHook(
      () => useIncrementChallengeProgressMutation(groupId, challengeId),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    );

    result.current.mutate({ taskId: 'task-1', delta: 5 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache reverted to the pre-mutation snapshot — no leftover optimistic value.
    expect(
      queryClient.getQueryData<ChallengeTaskProgress[]>(
        queryKeys.myProgress(groupId, challengeId),
      ),
    ).toEqual(initialProgress);

    // The API doesn't distinguish "not started yet" from "already ended" —
    // the UI intentionally shows one generic message for both, not two.
    expect(toast.error).toHaveBeenCalledWith(
      "This challenge hasn't started yet or has already ended.",
    );
  });
});
