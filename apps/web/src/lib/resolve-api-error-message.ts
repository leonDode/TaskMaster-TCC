import { ApiError } from '@/lib/api-error';
import en from '@/lib/i18n/dictionaries/en';
import ptBR from '@/lib/i18n/dictionaries/pt-BR';
import { translate } from '@/lib/i18n/translate';
import { useLocaleStore } from '@/stores/locale-store';

const dictionaries = { en, 'pt-BR': ptBR };

/**
 * Hints the call site can pass so the same HTTP status can be translated
 * into different, context-appropriate copy. Extend this union as new
 * features are wired up.
 */
export type ApiErrorContext =
  | 'generic'
  | 'category-mutation'
  | 'task-mutation'
  | 'task-occurrence-complete'
  | 'group-create'
  | 'group-join'
  | 'group-mutation'
  | 'group-member-remove'
  | 'group-leave'
  | 'challenge-mutation'
  | 'challenge-task-complete'
  | 'challenge-progress';

export function resolveApiErrorMessage(
  error: unknown,
  context: ApiErrorContext = 'generic',
): string {
  const errors = dictionaries[useLocaleStore.getState().locale].errors;
  const t = (key: string) => translate(errors, key);

  if (!(error instanceof ApiError)) {
    return t('fallback');
  }

  const validationMessage = () =>
    Array.isArray(error.body.message)
      ? error.body.message.join(' ')
      : error.body.message;

  switch (error.statusCode) {
    case 400:
      if (context === 'task-occurrence-complete') {
        return t('taskOccurrenceNotAvailable');
      }
      if (context === 'group-member-remove') {
        return t('groupMemberRemoveOwner');
      }
      if (context === 'challenge-progress') {
        return t('outsideChallengeWindow');
      }
      return validationMessage();

    case 401:
      // Handled globally (forces sign-out) — this copy is just a fallback
      // for the brief moment before the redirect happens.
      return t('sessionExpired');

    case 403:
      if (context === 'group-leave') {
        return t('groupLeaveTransferOwnership');
      }
      return t('noPermission');

    case 404:
      if (context === 'group-join') {
        return t('invalidInviteCode');
      }
      if (context === 'group-mutation' || context === 'challenge-mutation') {
        return t('groupOrChallengeNotFound');
      }
      return t('notFound');

    case 409:
      if (context === 'category-mutation') {
        return t('categoryDuplicate');
      }
      if (context === 'group-join') {
        return t('alreadyMember');
      }
      if (
        context === 'task-occurrence-complete' ||
        context === 'challenge-task-complete'
      ) {
        // Treated as a silent success by the caller (refetch instead of
        // surfacing an error) — this copy is a fallback only.
        return t('alreadyCompleted');
      }
      return t('conflict');

    case 429:
      if (context === 'group-create' || context === 'group-join') {
        return t('rateLimited');
      }
      return t('tooManyRequests');

    case 500:
    default:
      return t('fallback');
  }
}
