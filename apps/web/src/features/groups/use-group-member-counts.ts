import { useQueries } from '@tanstack/react-query';
import { listGroupMembers } from '@/features/groups/api';
import { queryKeys } from '@/lib/query-keys';

/**
 * `GET /groups` doesn't include a member count, so this composes one
 * `GET /groups/:id/members` call per group and reads the array length —
 * the same "not free but honest" tradeoff as category task counts.
 */
export function useGroupMemberCounts(groupIds: string[]) {
  const results = useQueries({
    queries: groupIds.map((id) => ({
      queryKey: queryKeys.groupMembers(id),
      queryFn: () => listGroupMembers(id),
      staleTime: 30_000,
    })),
  });

  return Object.fromEntries(
    groupIds.map((id, index) => [id, results[index].data?.length]),
  ) as Record<string, number | undefined>;
}
