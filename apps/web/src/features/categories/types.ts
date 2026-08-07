import type { CategoryType } from '@task-master/shared';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
