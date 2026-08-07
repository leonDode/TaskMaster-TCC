import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/features/categories/api';
import type { UpdateCategoryInput } from '@/features/categories/types';
import en from '@/lib/i18n/dictionaries/en';
import ptBR from '@/lib/i18n/dictionaries/pt-BR';
import { translate } from '@/lib/i18n/translate';
import { queryKeys } from '@/lib/query-keys';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { useLocaleStore } from '@/stores/locale-store';

const dictionaries = { en, 'pt-BR': ptBR };

function t(key: string): string {
  const categories = dictionaries[useLocaleStore.getState().locale].categories;
  return translate(categories, key);
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
      toast.success(t('categoryCreated'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'category-mutation'));
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
      toast.success(t('categoryUpdated'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'category-mutation'));
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(t('categoryDeleted'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'category-mutation'));
    },
  });
}
