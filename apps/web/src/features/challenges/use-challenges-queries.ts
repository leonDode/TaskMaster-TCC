import { useQuery } from '@tanstack/react-query';
import {
  getChallenge,
  getLeaderboard,
  getMyProgress,
  listChallenges,
} from '@/features/challenges/api';
import type { ChallengeStatus } from '@/features/challenges/types';
import { queryKeys } from '@/lib/query-keys';

export function useChallengesQuery(groupId: string, status: ChallengeStatus) {
  return useQuery({
    queryKey: queryKeys.challenges(groupId, status),
    queryFn: () => listChallenges(groupId, status),
  });
}

export function useChallengeQuery(groupId: string, challengeId: string) {
  return useQuery({
    queryKey: queryKeys.challenge(groupId, challengeId),
    queryFn: () => getChallenge(groupId, challengeId),
  });
}

export function useMyProgressQuery(groupId: string, challengeId: string) {
  return useQuery({
    queryKey: queryKeys.myProgress(groupId, challengeId),
    queryFn: () => getMyProgress(groupId, challengeId),
  });
}

export function useLeaderboardQuery(
  groupId: string,
  challengeId: string,
  isActive: boolean,
) {
  return useQuery({
    queryKey: queryKeys.leaderboard(groupId, challengeId),
    queryFn: () => getLeaderboard(groupId, challengeId),
    // The API's leaderboard cache invalidates instantly for the acting
    // member's own completions, but other members' progress only shows up
    // for us on the next fetch — poll while the challenge is still running.
    refetchInterval: isActive ? 60_000 : false,
  });
}
