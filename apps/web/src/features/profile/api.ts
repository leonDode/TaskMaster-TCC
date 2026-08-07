import { apiFetch } from '@/lib/api-client';
import type { UpdateUserInput, User } from '@/features/profile/types';

export function getMe(): Promise<User> {
  return apiFetch<User>('/users/me');
}

export function updateMe(input: UpdateUserInput): Promise<User> {
  return apiFetch<User>('/users/me', { method: 'PATCH', body: input });
}

/**
 * The field name `avatar` is required — it's what `FileInterceptor('avatar')`
 * on the API reads the file from.
 */
export function uploadAvatar(file: File): Promise<User> {
  const body = new FormData();
  body.append('avatar', file);
  return apiFetch<User>('/users/me/avatar', { method: 'POST', body });
}
