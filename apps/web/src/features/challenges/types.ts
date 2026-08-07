import type { TaskKind, UnitType } from '@task-master/shared';

export type ChallengeStatus = 'active' | 'upcoming' | 'past';

export interface Challenge {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  createdByMemberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeTask {
  id: string;
  challengeId: string;
  title: string;
  description: string | null;
  points: number;
  kind: TaskKind;
  targetValue: number | null;
  unit: UnitType | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeWithTasks extends Challenge {
  tasks: ChallengeTask[];
}

export interface ChallengeTaskProgress {
  challengeTaskId: string;
  title: string;
  points: number;
  completedToday: boolean;
  totalCompletions: number;
  kind: TaskKind;
  targetValue: number | null;
  unit: UnitType | null;
  /** Today's (UTC) increment only — not a running total for the challenge. */
  valueToday: number | null;
}

export interface LeaderboardEntry {
  groupMemberId: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  rank: number;
}

/** One ranking per `ChallengeTask` — the API no longer returns a single
 * flat leaderboard for the whole challenge. */
export interface TaskLeaderboard {
  challengeTaskId: string;
  title: string;
  kind: TaskKind;
  unit: UnitType | null;
  targetValue: number | null;
  entries: LeaderboardEntry[];
}

export interface CreateChallengeTaskInput {
  title: string;
  description?: string;
  kind?: TaskKind;
  targetValue?: number;
  unit?: UnitType;
}

export interface CreateChallengeInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  tasks: CreateChallengeTaskInput[];
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
}

export interface ChallengeProgressResult {
  challengeTaskId: string;
  progressOn: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
}
