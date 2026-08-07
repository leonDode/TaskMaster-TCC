import { useQuery } from '@tanstack/react-query';
import { getGroup, listGroupMembers, listGroups } from '@/features/groups/api';
import { queryKeys } from '@/lib/query-keys';

export function useGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups(),
    queryFn: listGroups,
  });
}

export function useGroupQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => getGroup(id),
  });
}

export function useGroupMembersQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.groupMembers(id),
    queryFn: () => listGroupMembers(id),
  });
}
