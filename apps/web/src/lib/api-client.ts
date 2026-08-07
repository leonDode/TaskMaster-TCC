import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase-client';
import { ApiError, type ApiErrorBody } from '@/lib/api-error';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Typed fetch wrapper around the API. Injects the Supabase session's access
 * token as `Authorization: Bearer <token>` when present, serializes `body`
 * as JSON, treats `204 No Content` as `undefined`, and throws `ApiError` for
 * any non-2xx response. Error routing must only ever be done via
 * `statusCode` — `message` comes from class-validator and isn't a stable
 * contract to match against.
 *
 * A `FormData` body is passed through untouched (file uploads): it must not
 * be JSON-serialized, and `Content-Type` must be left unset so the browser
 * can generate the multipart boundary itself.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isFormData = options.body instanceof FormData;

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  let body: BodyInit | undefined;
  if (isFormData) {
    body = options.body as FormData;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
    body,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const json: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(
      (json as ApiErrorBody | undefined) ?? {
        statusCode: response.status,
        message: response.statusText,
      },
    );
  }

  return json as T;
}
