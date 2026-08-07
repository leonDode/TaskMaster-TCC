export const queryKeys = {
  me: () => ['me'] as const,

  categories: () => ['categories'] as const,

  tasks: (filters: {
    categoryId?: string;
    recurring?: boolean;
    page?: number;
    pageSize?: number;
  }) => ['tasks', filters] as const,

  occurrences: (filters: { from: string; to: string; categoryId?: string }) =>
    ['occurrences', filters] as const,

  groups: () => ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  groupMembers: (id: string) => ['groups', id, 'members'] as const,

  challenges: (groupId: string, status: 'active' | 'upcoming' | 'past') =>
    ['groups', groupId, 'challenges', status] as const,
  challenge: (groupId: string, challengeId: string) =>
    ['groups', groupId, 'challenges', challengeId] as const,
  myProgress: (groupId: string, challengeId: string) =>
    ['groups', groupId, 'challenges', challengeId, 'my-progress'] as const,
  leaderboard: (groupId: string, challengeId: string) =>
    ['groups', groupId, 'challenges', challengeId, 'leaderboard'] as const,
};
