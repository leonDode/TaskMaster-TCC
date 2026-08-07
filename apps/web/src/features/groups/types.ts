export type GroupRole = 'OWNER' | 'MEMBER';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupMemberWithProfile {
  id: string;
  role: GroupRole;
  joinedAt: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;
