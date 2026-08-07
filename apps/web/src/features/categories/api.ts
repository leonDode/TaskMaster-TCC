import { apiFetch } from '@/lib/api-client';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/categories/types';

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiFetch<Category>('/categories', { method: 'POST', body: input });
}

export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
