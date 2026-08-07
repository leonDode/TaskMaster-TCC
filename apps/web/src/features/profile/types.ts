export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors `UpdateUserDto` on the API. `avatarUrl` is deliberately absent: the
 * API rejects it here (ValidationPipe runs with `forbidNonWhitelisted`) and
 * the avatar is only writable through `POST /users/me/avatar`. Keeping it out
 * of the type is what stops it from being reintroduced into the payload.
 */
export interface UpdateUserInput {
  displayName?: string;
  timezone?: string;
}
