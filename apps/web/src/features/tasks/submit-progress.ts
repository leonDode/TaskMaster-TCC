import {
  submitOccurrenceProgress,
  submitOneOffProgress,
} from '@/features/tasks/api';
import type { ProgressInput, ProgressResult } from '@/features/tasks/types';
import { ApiError } from '@/lib/api-error';

/**
 * Mirrors `toggleOccurrence` (see `features/occurrences/toggle-occurrence.ts`):
 * `GET /tasks/occurrences` doesn't say whether a task is recurring or
 * one-off, so submitting progress from an occurrences-based view always
 * tries the recurring endpoint first and falls back to the one-off endpoint
 * on the API's 400 ("wrong mode") response.
 */
export async function submitProgress(
  taskId: string,
  date: string,
  input: ProgressInput,
): Promise<ProgressResult> {
  try {
    return await submitOccurrenceProgress(taskId, date, input);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 400) {
      return await submitOneOffProgress(taskId, input);
    }
    throw error;
  }
}
