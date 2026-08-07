import { PlusCircle, Swords, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { CreateGroupDialog } from '@/features/groups/create-group-dialog';
import { JoinGroupDialog } from '@/features/groups/join-group-dialog';
import { useGroupMemberCounts } from '@/features/groups/use-group-member-counts';
import { useGroupsQuery } from '@/features/groups/use-groups-queries';
import { useTranslation } from '@/lib/i18n/use-translation';

export function GroupsPage() {
  const { t } = useTranslation();
  const { data: groups, isPending, isError, error, refetch } = useGroupsQuery();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const groupIds = useMemo(() => (groups ?? []).map((g) => g.id), [groups]);
  const memberCounts = useGroupMemberCounts(groupIds);

  return (
    <div>
      <PageHeader
        title={t('groups.pageTitle')}
        description={t('groups.pageDescription')}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <PlusCircle className="size-4" />
              {t('groups.joinGroupButton')}
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
            >
              <Users className="size-4" />
              {t('groups.createGroupButton')}
            </Button>
          </div>
        }
      />

      {isPending ? (
        <LoadingState label={t('groups.loadingGroupsLabel')} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          title={t('groups.emptyTitle')}
          description={t('groups.emptyDescription')}
          icon={Users}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              {t('groups.createGroupButton')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="bg-card border-outline-variant/10 hover:border-primary/50 flex flex-col rounded-lg border p-gutter text-left transition-all"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="bg-surface-variant text-primary flex size-12 items-center justify-center rounded-lg">
                  <Swords className="size-6" />
                </div>
                <div>
                  <h3 className="text-title-md text-on-surface">
                    {group.name}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">
                    {memberCounts[group.id] !== undefined
                      ? t('groups.memberCount', {
                          count: memberCounts[group.id],
                        })
                      : '…'}
                  </p>
                </div>
              </div>
              {group.description && (
                <p className="text-body-sm text-on-surface-variant">
                  {group.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinGroupDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
