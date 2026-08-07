import { apiFetch } from '@/lib/api-client';
import { parseDecimal } from '@/lib/decimal';
import type {
  CreateTaskInput,
  FindTasksParams,
  ProgressInput,
  ProgressResult,
  Task,
  TaskOccurrence,
  TasksPage,
  UpdateTaskInput,
} from '@/features/tasks/types';

type TaskDto = Omit<Task, 'targetValue'> & { targetValue: string | null };
type TaskOccurrenceDto = Omit<
  TaskOccurrence,
  'targetValue' | 'currentValue'
> & {
  targetValue: string | null;
  currentValue: string | null;
};
type ProgressResultDto = Omit<
  ProgressResult,
  'currentValue' | 'targetValue'
> & {
  currentValue: string;
  targetValue: string;
};

function mapTask(dto: TaskDto): Task {
  return { ...dto, targetValue: parseDecimal(dto.targetValue) };
}

function mapOccurrence(dto: TaskOccurrenceDto): TaskOccurrence {
  return {
    ...dto,
    targetValue: parseDecimal(dto.targetValue),
    currentValue: parseDecimal(dto.currentValue),
  };
}

function mapProgressResult(dto: ProgressResultDto): ProgressResult {
  return {
    ...dto,
    currentValue: Number(dto.currentValue),
    targetValue: Number(dto.targetValue),
  };
}

function toQueryString<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listTasks(params: FindTasksParams): Promise<TasksPage> {
  const page = await apiFetch<Omit<TasksPage, 'items'> & { items: TaskDto[] }>(
    `/tasks${toQueryString(params)}`,
  );
  return { ...page, items: page.items.map(mapTask) };
}

export async function getOccurrences(params: {
  from: string;
  to: string;
  categoryId?: string;
}): Promise<TaskOccurrence[]> {
  const occurrences = await apiFetch<TaskOccurrenceDto[]>(
    `/tasks/occurrences${toQueryString(params)}`,
  );
  return occurrences.map(mapOccurrence);
}

export async function getTask(id: string): Promise<Task> {
  return mapTask(await apiFetch<TaskDto>(`/tasks/${id}`));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return mapTask(
    await apiFetch<TaskDto>('/tasks', { method: 'POST', body: input }),
  );
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  return mapTask(
    await apiFetch<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: input }),
  );
}

export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export function resetAllTasks(): Promise<{ deletedCount: number }> {
  return apiFetch<{ deletedCount: number }>('/tasks', { method: 'DELETE' });
}

export function completeOneOff(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}/complete`, { method: 'POST' });
}

export function uncompleteOneOff(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}/complete`, { method: 'DELETE' });
}

export function completeOccurrence(id: string, date: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}/occurrences/${date}/complete`, {
    method: 'POST',
  });
}

export function uncompleteOccurrence(id: string, date: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}/occurrences/${date}/complete`, {
    method: 'DELETE',
  });
}

export async function submitOneOffProgress(
  id: string,
  input: ProgressInput,
): Promise<ProgressResult> {
  return mapProgressResult(
    await apiFetch<ProgressResultDto>(`/tasks/${id}/progress`, {
      method: 'POST',
      body: input,
    }),
  );
}

export async function submitOccurrenceProgress(
  id: string,
  date: string,
  input: ProgressInput,
): Promise<ProgressResult> {
  return mapProgressResult(
    await apiFetch<ProgressResultDto>(
      `/tasks/${id}/occurrences/${date}/progress`,
      { method: 'POST', body: input },
    ),
  );
}
