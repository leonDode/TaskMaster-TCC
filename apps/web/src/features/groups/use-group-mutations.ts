import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  regenerateInviteCode,
  removeGroupMember,
  updateGroup,
} from '@/features/groups/api';
import type { UpdateGroupInput } from '@/features/groups/types';
import en from '@/lib/i18n/dictionaries/en';
import ptBR from '@/lib/i18n/dictionaries/pt-BR';
import { translate } from '@/lib/i18n/translate';
import { queryKeys } from '@/lib/query-keys';
import { resolveApiErrorMessage } from '@/lib/resolve-api-error-message';
import { useLocaleStore } from '@/stores/locale-store';

const dictionaries = { en, 'pt-BR': ptBR };

function tGroups(key: string): string {
  const groups = dictionaries[useLocaleStore.getState().locale].groups;
  return translate(groups, key);
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success(tGroups('groupCreatedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-create'));
    },
  });
}

export function useJoinGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success(tGroups('joinedGroupToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-join'));
    },
  });
}

export function useUpdateGroupMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupInput) => updateGroup(groupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      toast.success(tGroups('groupUpdatedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-mutation'));
    },
  });
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success(tGroups('groupDeletedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-mutation'));
    },
  });
}

export function useRegenerateInviteCodeMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateInviteCode(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      toast.success(tGroups('inviteCodeRegeneratedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-mutation'));
    },
  });
}

export function useRemoveGroupMemberMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeGroupMember(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers(groupId),
      });
      toast.success(tGroups('memberRemovedToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-member-remove'));
    },
  });
}

export function useLeaveGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success(tGroups('leftGroupToast'));
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'group-leave'));
    },
  });
}
