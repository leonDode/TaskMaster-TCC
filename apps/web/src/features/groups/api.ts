import { apiFetch } from '@/lib/api-client';
import type {
  CreateGroupInput,
  Group,
  GroupMember,
  GroupMemberWithProfile,
  UpdateGroupInput,
} from '@/features/groups/types';

export function listGroups(): Promise<Group[]> {
  return apiFetch<Group[]>('/groups');
}

export function getGroup(id: string): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}`);
}

export function createGroup(input: CreateGroupInput): Promise<Group> {
  return apiFetch<Group>('/groups', { method: 'POST', body: input });
}

export function joinGroup(inviteCode: string): Promise<GroupMember> {
  return apiFetch<GroupMember>('/groups/join', {
    method: 'POST',
    body: { inviteCode },
  });
}

export function updateGroup(
  id: string,
  input: UpdateGroupInput,
): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}`, { method: 'PATCH', body: input });
}

export function deleteGroup(id: string): Promise<void> {
  return apiFetch<void>(`/groups/${id}`, { method: 'DELETE' });
}

export function regenerateInviteCode(id: string): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}/invite-code/regenerate`, {
    method: 'POST',
  });
}

export function listGroupMembers(
  id: string,
): Promise<GroupMemberWithProfile[]> {
  return apiFetch<GroupMemberWithProfile[]>(`/groups/${id}/members`);
}

export function removeGroupMember(id: string, memberId: string): Promise<void> {
  return apiFetch<void>(`/groups/${id}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export function leaveGroup(id: string): Promise<void> {
  return apiFetch<void>(`/groups/${id}/leave`, { method: 'POST' });
}
