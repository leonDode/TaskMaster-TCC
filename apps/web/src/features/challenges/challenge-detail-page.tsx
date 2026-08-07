import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { ChallengeFormDialog } from '@/features/challenges/challenge-form-dialog';
import { ChallengeTaskList } from '@/features/challenges/challenge-task-list';
import { LeaderboardTable } from '@/features/challenges/leaderboard-table';
import { MyProgressPanel } from '@/features/challenges/my-progress-panel';
import type { ChallengeTaskProgress } from '@/features/challenges/types';
import {
  useChallengeQuery,
  useMyProgressQuery,
} from '@/features/challenges/use-challenges-queries';
import { useDeleteChallengeMutation } from '@/features/challenges/use-challenge-mutations';
import { useGroupMembersQuery } from '@/features/groups/use-groups-queries';
import { useUserQuery } from '@/features/profile/use-user-query';
import { useTranslation } from '@/lib/i18n/use-translation';

export function ChallengeDetailPage() {
  const { t, locale } = useTranslation();
  const { groupId, challengeId } = useParams<{
    groupId: string;
    challengeId: string;
  }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const challengeQuery = useChallengeQuery(groupId!, challengeId!);
  const progressQuery = useMyProgressQuery(groupId!, challengeId!);
  const membersQuery = useGroupMembersQuery(groupId!);
  const { data: user } = useUserQuery();
  const deleteChallenge = useDeleteChallengeMutation(groupId!);

  const currentMember = membersQuery.data?.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === 'OWNER';

  const progressByTaskId = useMemo(() => {
    const map = new Map<string, ChallengeTaskProgress>();
    for (const p of progressQuery.data ?? []) {
      map.set(p.challengeTaskId, p);
    }
    return map;
  }, [progressQuery.data]);

  if (challengeQuery.isPending) {
    return <LoadingState label={t('challenges.loadingChallengeLabel')} />;
  }

  if (challengeQuery.isError) {
    return (
      <ErrorState
        error={challengeQuery.error}
        context="challenge-mutation"
        onRetry={() => challengeQuery.refetch()}
      />
    );
  }

  const challenge = challengeQuery.data;
  const now = new Date();
  const startAt = new Date(challenge.startAt);
  const endAt = new Date(challenge.endAt);
  const isActive = now >= startAt && now <= endAt;
  const totalDays = Math.max(
    1,
    Math.ceil((endAt.getTime() - startAt.getTime()) / 86_400_000),
  );
  const daysLeft = Math.max(
    0,
    Math.ceil((endAt.getTime() - now.getTime()) / 86_400_000),
  );

  return (
    <div>
      <PageHeader
        title={challenge.title}
        description={challenge.description ?? undefined}
        actions={
          isOwner ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                {t('challenges.editButton')}
              </Button>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  deleteChallenge.mutate(challenge.id, {
                    onSuccess: () => navigate(`/groups/${groupId}`),
                  });
                }}
              >
                <Trash2 className="size-4" />
                {t('challenges.deleteButton')}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <span className="bg-surface-container text-on-surface-variant text-label-caps rounded-full px-3 py-1 uppercase">
          {startAt.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : undefined)}{' '}
          – {endAt.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : undefined)}
        </span>
        <span className="bg-primary/10 text-primary text-label-caps rounded-full px-3 py-1 uppercase">
          {isActive
            ? t('challenges.daysLeftCount', { count: daysLeft })
            : now < startAt
              ? t('challenges.upcomingBadge')
              : t('challenges.endedBadge')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ChallengeTaskList
            groupId={groupId!}
            challengeId={challengeId!}
            tasks={challenge.tasks}
            progressByTaskId={progressByTaskId}
            isOwner={isOwner}
            canComplete={isActive}
          />
        </div>
        <div className="flex flex-col gap-gutter lg:col-span-4">
          <MyProgressPanel
            groupId={groupId!}
            challengeId={challengeId!}
            totalDays={totalDays}
          />
          <LeaderboardTable
            groupId={groupId!}
            challengeId={challengeId!}
            currentUserId={currentMember?.id}
            isActive={isActive}
          />
        </div>
      </div>

      <ChallengeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        groupId={groupId!}
        challenge={challenge}
      />
    </div>
  );
}
