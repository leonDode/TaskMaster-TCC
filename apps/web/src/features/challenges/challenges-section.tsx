import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ChallengeFormDialog } from '@/features/challenges/challenge-form-dialog';
import type { ChallengeStatus } from '@/features/challenges/types';
import { useChallengesQuery } from '@/features/challenges/use-challenges-queries';
import { useTranslation } from '@/lib/i18n/use-translation';

interface ChallengesSectionProps {
  groupId: string;
  isOwner: boolean;
}

const EMPTY_TITLE_KEYS: Record<ChallengeStatus, string> = {
  active: 'challenges.emptyTitleActive',
  upcoming: 'challenges.emptyTitleUpcoming',
  past: 'challenges.emptyTitlePast',
};

export function ChallengesSection({
  groupId,
  isOwner,
}: ChallengesSectionProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ChallengeStatus>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const challengesQuery = useChallengesQuery(groupId, status);
  const navigate = useNavigate();

  const statusLabels: Record<ChallengeStatus, string> = {
    active: t('challenges.statusActive'),
    upcoming: t('challenges.statusUpcoming'),
    past: t('challenges.statusPast'),
  };

  return (
    <div className="bg-card border-outline-variant/10 rounded-lg border p-gutter">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-title-md text-on-surface">
          {t('challenges.sectionTitle')}
        </p>
        {isOwner && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('challenges.newChallengeButton')}
          </Button>
        )}
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => setStatus(v as ChallengeStatus)}
        className="mb-4"
      >
        <TabsList>
          {(['active', 'upcoming', 'past'] as const).map((s) => (
            <TabsTrigger key={s} value={s}>
              {statusLabels[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {challengesQuery.isPending ? (
        <LoadingState label={t('challenges.loadingChallengesLabel')} />
      ) : challengesQuery.isError ? (
        <ErrorState
          error={challengesQuery.error}
          context="challenge-mutation"
          onRetry={() => challengesQuery.refetch()}
        />
      ) : challengesQuery.data.length === 0 ? (
        <EmptyState
          title={t(EMPTY_TITLE_KEYS[status])}
          description={
            isOwner
              ? t('challenges.emptyDescriptionOwner')
              : t('challenges.emptyDescriptionMember')
          }
          action={
            isOwner ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                {t('challenges.createChallengeButton')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2">
          {challengesQuery.data.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() =>
                navigate(`/groups/${groupId}/challenges/${challenge.id}`)
              }
              className="bg-surface-container border-outline-variant/10 hover:border-primary/50 rounded-lg border p-4 text-left transition-all"
            >
              <p className="text-title-md text-on-surface">{challenge.title}</p>
              {challenge.description && (
                <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                  {challenge.description}
                </p>
              )}
              <p className="text-label-caps text-neon-cyan mt-3 uppercase">
                {new Date(challenge.startAt).toLocaleDateString()} –{' '}
                {new Date(challenge.endAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}

      <ChallengeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupId={groupId}
      />
    </div>
  );
}
