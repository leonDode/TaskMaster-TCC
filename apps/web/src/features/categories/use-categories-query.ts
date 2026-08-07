import { useQuery } from '@tanstack/react-query';
import { listCategories } from '@/features/categories/api';
import { queryKeys } from '@/lib/query-keys';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: listCategories,
  });
}
