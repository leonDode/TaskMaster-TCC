import { UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import type { GroupMemberWithProfile } from '@/features/groups/types';
import { useGroupMembersQuery } from '@/features/groups/use-groups-queries';
import { useRemoveGroupMemberMutation } from '@/features/groups/use-group-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';

interface GroupMembersPanelProps {
  groupId: string;
  currentUserId: string;
}

function initialsFor(member: GroupMemberWithProfile): string {
  return (member.displayName ?? 'M').trim().charAt(0).toUpperCase();
}

export function GroupMembersPanel({
  groupId,
  currentUserId,
}: GroupMembersPanelProps) {
  const { t } = useTranslation();
  const membersQuery = useGroupMembersQuery(groupId);
  const removeMember = useRemoveGroupMemberMutation(groupId);

  const currentMember = membersQuery.data?.find(
    (m) => m.userId === currentUserId,
  );
  const isOwner = currentMember?.role === 'OWNER';

  if (membersQuery.isPending) {
    return <LoadingState label={t('groups.membersLoadingLabel')} />;
  }

  if (membersQuery.isError) {
    return (
      <ErrorState
        error={membersQuery.error}
        onRetry={() => membersQuery.refetch()}
      />
    );
  }

  return (
    <div className="bg-card border-outline-variant/10 rounded-lg border p-gutter">
      <p className="text-title-md text-on-surface mb-4">
        {t('groups.membersPanelTitle', { count: membersQuery.data.length })}
      </p>
      <div className="flex flex-col gap-3">
        {membersQuery.data.map((member) => (
          <div
            key={member.id}
            className="border-outline-variant/10 flex items-center gap-3 rounded-lg border p-3"
          >
            <Avatar className="size-9">
              <AvatarImage src={member.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-surface-container-high text-on-surface">
                {initialsFor(member)}
              </AvatarFallback>
            </Avatar>
            <span className="text-body-sm text-on-surface flex-1">
              {member.displayName ?? t('groups.memberFallbackName')}
            </span>
            <Badge
              variant="outline"
              className={
                member.role === 'OWNER'
                  ? 'border-primary text-primary'
                  : 'text-on-surface-variant'
              }
            >
              {member.role === 'OWNER'
                ? t('groups.roleOwner')
                : t('groups.roleMember')}
            </Badge>
            {isOwner && member.role !== 'OWNER' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMember.mutate(member.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <UserX className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
