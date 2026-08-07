import { useQueries } from '@tanstack/react-query';
import { listTasks } from '@/features/tasks/api';
import { queryKeys } from '@/lib/query-keys';

/**
 * The categories list endpoint doesn't return task counts, so this composes
 * one lightweight `GET /tasks?categoryId&pageSize=1` call per category and
 * reads `.total` off the pagination envelope — cheaper than fetching full
 * task lists just to count them.
 */
export function useCategoryTaskCounts(categoryIds: string[]) {
  const results = useQueries({
    queries: categoryIds.map((categoryId) => {
      const filters = { categoryId, page: 1, pageSize: 1 };
      return {
        queryKey: queryKeys.tasks(filters),
        queryFn: () => listTasks(filters),
        staleTime: 30_000,
      };
    }),
  });

  return Object.fromEntries(
    categoryIds.map((id, index) => [id, results[index].data?.total]),
  ) as Record<string, number | undefined>;
}
