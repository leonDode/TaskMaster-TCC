import { LogOut, Pencil, Swords, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { ChallengesSection } from '@/features/challenges/challenges-section';
import { CreateGroupDialog } from '@/features/groups/create-group-dialog';
import { GroupMembersPanel } from '@/features/groups/group-members-panel';
import { InviteCodeCard } from '@/features/groups/invite-code-card';
import {
  useGroupMembersQuery,
  useGroupQuery,
} from '@/features/groups/use-groups-queries';
import {
  useDeleteGroupMutation,
  useLeaveGroupMutation,
} from '@/features/groups/use-group-mutations';
import { useUserQuery } from '@/features/profile/use-user-query';
import { useTranslation } from '@/lib/i18n/use-translation';

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const groupQuery = useGroupQuery(groupId!);
  const membersQuery = useGroupMembersQuery(groupId!);
  const { data: user } = useUserQuery();
  const deleteGroup = useDeleteGroupMutation();
  const leaveGroup = useLeaveGroupMutation();

  if (groupQuery.isPending) {
    return <LoadingState label={t('groups.loadingGroupLabel')} />;
  }

  if (groupQuery.isError) {
    return (
      <ErrorState
        error={groupQuery.error}
        context="group-mutation"
        onRetry={() => groupQuery.refetch()}
      />
    );
  }

  const group = groupQuery.data;
  const currentMember = membersQuery.data?.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === 'OWNER';

  return (
    <div>
      <PageHeader
        title={group.name}
        description={group.description ?? undefined}
        actions={
          isOwner ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                {t('groups.editButton')}
              </Button>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  deleteGroup.mutate(group.id, {
                    onSuccess: () => navigate('/groups'),
                  });
                }}
              >
                <Trash2 className="size-4" />
                {t('groups.deleteGroupButton')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                leaveGroup.mutate(group.id, {
                  onSuccess: () => navigate('/groups'),
                });
              }}
            >
              <LogOut className="size-4" />
              {t('groups.leaveGroupButton')}
            </Button>
          )
        }
      />

      <div className="mb-8 flex items-center gap-3">
        <div className="bg-surface-variant text-primary flex size-12 items-center justify-center rounded-lg">
          <Swords className="size-6" />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {membersQuery.data
            ? t('groups.memberCount', { count: membersQuery.data.length })
            : '…'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <InviteCodeCard
          groupId={group.id}
          inviteCode={group.inviteCode}
          isOwner={isOwner}
        />
        {user && (
          <GroupMembersPanel groupId={group.id} currentUserId={user.id} />
        )}
      </div>

      {isOwner && (
        <p className="text-body-sm text-on-surface-variant mt-4">
          {t('groups.ownerLeaveHint')}
        </p>
      )}

      <div className="mt-gutter">
        <ChallengesSection groupId={group.id} isOwner={isOwner} />
      </div>

      <CreateGroupDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        group={group}
      />
    </div>
  );
}
