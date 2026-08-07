import {
  completeOccurrence,
  completeOneOff,
  uncompleteOccurrence,
  uncompleteOneOff,
} from '@/features/tasks/api';
import { ApiError } from '@/lib/api-error';

/**
 * `GET /tasks/occurrences` doesn't say whether a task is recurring or
 * one-off, so toggling completion from an occurrences-based view (Dashboard,
 * Calendar) always tries the recurring endpoint first and falls back to the
 * one-off endpoint on the API's 400 ("wrong mode") response — this mirrors
 * exactly how the API itself distinguishes the two, instead of duplicating
 * that logic client-side.
 */
export async function toggleOccurrence(
  taskId: string,
  date: string,
  checked: boolean,
): Promise<void> {
  try {
    if (checked) {
      await completeOccurrence(taskId, date);
    } else {
      await uncompleteOccurrence(taskId, date);
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 400) {
      if (checked) {
        await completeOneOff(taskId);
      } else {
        await uncompleteOneOff(taskId);
      }
      return;
    }
    throw error;
  }
}
