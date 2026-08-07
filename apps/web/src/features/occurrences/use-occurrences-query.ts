import { useQuery } from '@tanstack/react-query';
import { getOccurrences } from '@/features/tasks/api';
import { queryKeys } from '@/lib/query-keys';

export function useOccurrencesQuery(filters: {
  from: string;
  to: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.occurrences(filters),
    queryFn: () => getOccurrences(filters),
  });
}
