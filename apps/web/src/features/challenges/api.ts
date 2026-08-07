import { apiFetch } from '@/lib/api-client';
import type {
  Challenge,
  ChallengeProgressResult,
  ChallengeStatus,
  ChallengeTask,
  ChallengeTaskProgress,
  ChallengeWithTasks,
  CreateChallengeInput,
  CreateChallengeTaskInput,
  TaskLeaderboard,
  UpdateChallengeInput,
} from '@/features/challenges/types';
import { parseDecimal } from '@/lib/decimal';

type ChallengeTaskDto = Omit<ChallengeTask, 'targetValue'> & {
  targetValue: string | null;
};
type ChallengeTaskProgressDto = Omit<
  ChallengeTaskProgress,
  'targetValue' | 'valueToday'
> & {
  targetValue: string | null;
  valueToday: string | null;
};
type TaskLeaderboardDto = Omit<TaskLeaderboard, 'targetValue' | 'entries'> & {
  targetValue: string | null;
  entries: (Omit<TaskLeaderboard['entries'][number], 'score'> & {
    score: string;
  })[];
};
type ChallengeProgressResultDto = Omit<
  ChallengeProgressResult,
  'currentValue' | 'targetValue'
> & {
  currentValue: string;
  targetValue: string;
};

function mapChallengeTask(dto: ChallengeTaskDto): ChallengeTask {
  return { ...dto, targetValue: parseDecimal(dto.targetValue) };
}

function mapChallengeTaskProgress(
  dto: ChallengeTaskProgressDto,
): ChallengeTaskProgress {
  return {
    ...dto,
    targetValue: parseDecimal(dto.targetValue),
    valueToday: parseDecimal(dto.valueToday),
  };
}

function mapTaskLeaderboard(dto: TaskLeaderboardDto): TaskLeaderboard {
  return {
    ...dto,
    targetValue: parseDecimal(dto.targetValue),
    entries: dto.entries.map((entry) => ({
      ...entry,
      score: Number(entry.score),
    })),
  };
}

function mapChallengeProgressResult(
  dto: ChallengeProgressResultDto,
): ChallengeProgressResult {
  return {
    ...dto,
    currentValue: Number(dto.currentValue),
    targetValue: Number(dto.targetValue),
  };
}

function base(groupId: string): string {
  return `/groups/${groupId}/challenges`;
}

export function listChallenges(
  groupId: string,
  status?: ChallengeStatus,
): Promise<Challenge[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<Challenge[]>(`${base(groupId)}${query}`);
}

export async function getChallenge(
  groupId: string,
  id: string,
): Promise<ChallengeWithTasks> {
  const dto = await apiFetch<
    Omit<ChallengeWithTasks, 'tasks'> & { tasks: ChallengeTaskDto[] }
  >(`${base(groupId)}/${id}`);
  return { ...dto, tasks: dto.tasks.map(mapChallengeTask) };
}

export function createChallenge(
  groupId: string,
  input: CreateChallengeInput,
): Promise<Challenge> {
  return apiFetch<Challenge>(base(groupId), { method: 'POST', body: input });
}

export function updateChallenge(
  groupId: string,
  id: string,
  input: UpdateChallengeInput,
): Promise<Challenge> {
  return apiFetch<Challenge>(`${base(groupId)}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteChallenge(groupId: string, id: string): Promise<void> {
  return apiFetch<void>(`${base(groupId)}/${id}`, { method: 'DELETE' });
}

export async function addChallengeTask(
  groupId: string,
  challengeId: string,
  input: CreateChallengeTaskInput,
): Promise<ChallengeTask> {
  return mapChallengeTask(
    await apiFetch<ChallengeTaskDto>(`${base(groupId)}/${challengeId}/tasks`, {
      method: 'POST',
      body: input,
    }),
  );
}

export async function updateChallengeTask(
  groupId: string,
  challengeId: string,
  taskId: string,
  input: Partial<CreateChallengeTaskInput>,
): Promise<ChallengeTask> {
  return mapChallengeTask(
    await apiFetch<ChallengeTaskDto>(
      `${base(groupId)}/${challengeId}/tasks/${taskId}`,
      { method: 'PATCH', body: input },
    ),
  );
}

export function removeChallengeTask(
  groupId: string,
  challengeId: string,
  taskId: string,
): Promise<void> {
  return apiFetch<void>(`${base(groupId)}/${challengeId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export function completeChallengeTask(
  groupId: string,
  challengeId: string,
  taskId: string,
): Promise<void> {
  return apiFetch<void>(
    `${base(groupId)}/${challengeId}/tasks/${taskId}/complete`,
    { method: 'POST' },
  );
}

export function uncompleteChallengeTask(
  groupId: string,
  challengeId: string,
  taskId: string,
): Promise<void> {
  return apiFetch<void>(
    `${base(groupId)}/${challengeId}/tasks/${taskId}/complete`,
    { method: 'DELETE' },
  );
}

export async function getMyProgress(
  groupId: string,
  challengeId: string,
): Promise<ChallengeTaskProgress[]> {
  const rows = await apiFetch<ChallengeTaskProgressDto[]>(
    `${base(groupId)}/${challengeId}/my-progress`,
  );
  return rows.map(mapChallengeTaskProgress);
}

export async function getLeaderboard(
  groupId: string,
  challengeId: string,
): Promise<TaskLeaderboard[]> {
  const rows = await apiFetch<TaskLeaderboardDto[]>(
    `${base(groupId)}/${challengeId}/leaderboard`,
  );
  return rows.map(mapTaskLeaderboard);
}

export async function submitChallengeTaskProgress(
  groupId: string,
  challengeId: string,
  taskId: string,
  delta: number,
): Promise<ChallengeProgressResult> {
  return mapChallengeProgressResult(
    await apiFetch<ChallengeProgressResultDto>(
      `${base(groupId)}/${challengeId}/tasks/${taskId}/progress`,
      { method: 'POST', body: { delta } },
    ),
  );
}
