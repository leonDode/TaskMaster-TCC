import type { TaskKind, UnitType } from '@task-master/shared';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type TaskStatus = 'TODO' | 'IN_PROGRESS';

export interface Task {
  id: string;
  userId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  kind: TaskKind;
  targetValue: number | null;
  unit: UnitType | null;
  dueDate: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceMonth: number | null;
  recurrenceStartDate: string | null;
  recurrenceEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TasksPage {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FindTasksParams {
  categoryId?: string;
  recurring?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  categoryId?: string;
  kind?: TaskKind;
  targetValue?: number;
  unit?: UnitType;
  dueDate?: string;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceMonth?: number;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  categoryId?: string | null;
  status?: TaskStatus;
  targetValue?: number;
  unit?: UnitType;
  dueDate?: string;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceMonth?: number;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}

export interface TaskOccurrence {
  taskId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  occurrenceDate: string;
  completed: boolean;
  kind: TaskKind;
  targetValue: number | null;
  unit: UnitType | null;
  currentValue: number | null;
}

export interface ProgressResult {
  currentValue: number;
  targetValue: number;
  completed: boolean;
}

export interface ProgressInput {
  delta?: number;
  value?: number;
}
