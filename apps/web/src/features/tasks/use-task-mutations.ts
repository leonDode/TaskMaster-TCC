import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTask, deleteTask, updateTask } from '@/features/tasks/api';
import type { UpdateTaskInput } from '@/features/tasks/types';
import en from '@/lib/i18n/dictionaries/en';
import ptBR from '@/lib/i18n/dictionaries/pt-BR';
import { translate } from '@/lib/i18n/translate';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { useLocaleStore } from '@/stores/locale-store';

const dictionaries = { en, 'pt-BR': ptBR };

function t(key: string): string {
  const tasks = dictionaries[useLocaleStore.getState().locale].tasks;
  return translate(tasks, key);
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      toast.success(t('taskCreated'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'task-mutation'));
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      toast.success(t('taskUpdated'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'task-mutation'));
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      toast.success(t('taskDeleted'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'task-mutation'));
    },
  });
}
