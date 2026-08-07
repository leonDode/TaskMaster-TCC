import { useQuery } from '@tanstack/react-query';
import { listTasks } from '@/features/tasks/api';
import type { FindTasksParams } from '@/features/tasks/types';
import { queryKeys } from '@/lib/query-keys';

export function useTasksQuery(filters: FindTasksParams) {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => listTasks(filters),
    placeholderData: (previousData) => previousData,
  });
}
