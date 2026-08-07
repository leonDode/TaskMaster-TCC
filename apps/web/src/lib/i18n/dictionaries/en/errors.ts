import type { NamespaceDictionary } from '../../types';

const errors = {
  fallback: 'Something went wrong. Please try again.',
  taskOccurrenceNotAvailable: 'This action is not available for this task.',
  groupMemberRemoveOwner:
    "The owner can't be removed — delete the group instead.",
  sessionExpired: 'Your session has expired. Signing you out.',
  groupLeaveTransferOwnership:
    'Transfer ownership or delete the group before leaving it.',
  noPermission: "You don't have permission to do this.",
  invalidInviteCode: 'Invalid invite code.',
  groupOrChallengeNotFound: 'Group or challenge not found.',
  notFound: 'Not found.',
  categoryDuplicate: 'A category with this name already exists.',
  alreadyMember: "You're already a member of this group.",
  alreadyCompleted: 'Already completed.',
  conflict: 'This conflicts with existing data.',
  rateLimited: "You're doing that too often — wait a minute and try again.",
  tooManyRequests: 'Too many requests. Please slow down.',
  outsideChallengeWindow:
    "This challenge hasn't started yet or has already ended.",
} satisfies NamespaceDictionary;

export default errors;
