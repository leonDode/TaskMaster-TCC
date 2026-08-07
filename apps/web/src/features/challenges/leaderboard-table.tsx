import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import type { TaskLeaderboard } from '@/features/challenges/types';
import { useLeaderboardQuery } from '@/features/challenges/use-challenges-queries';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

interface LeaderboardTableProps {
  groupId: string;
  challengeId: string;
  currentUserId?: string;
  isActive: boolean;
}

function ScoreCell({
  entry,
  taskKind,
  unitLabel,
}: {
  entry: TaskLeaderboard['entries'][number];
  taskKind: TaskLeaderboard['kind'];
  unitLabel: string;
}) {
  if (taskKind === 'BOOLEAN') {
    return <>{entry.score}</>;
  }
  return (
    <>
      {entry.score} {unitLabel}
    </>
  );
}

function TaskLeaderboardPanel({
  taskLeaderboard,
  currentUserId,
}: {
  taskLeaderboard: TaskLeaderboard;
  currentUserId?: string;
}) {
  const { t } = useTranslation();
  const unitLabel = taskLeaderboard.unit
    ? t(`units.${taskLeaderboard.unit}`)
    : '';

  if (taskLeaderboard.entries.length === 0) {
    return (
      <EmptyState title={t('challenges.noMembersYetTitle')} icon={Trophy} />
    );
  }

  return (
    <>
      <div className="text-label-caps text-on-surface-variant grid grid-cols-[40px_1fr_100px] items-center px-4 py-2 uppercase">
        <span>{t('challenges.posColumnHeader')}</span>
        <span>{t('challenges.memberColumnHeader')}</span>
        <span className="text-right">
          {taskLeaderboard.kind === 'BOOLEAN'
            ? t('challenges.completionsColumnHeader')
            : t('challenges.scoreColumnHeader')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {taskLeaderboard.entries.map((entry) => {
          const isMe = entry.groupMemberId === currentUserId;
          const initials = (entry.displayName ?? 'M').charAt(0).toUpperCase();
          return (
            <div
              key={entry.groupMemberId}
              className={cn(
                'grid grid-cols-[40px_1fr_100px] items-center rounded-lg px-4 py-3',
                isMe
                  ? 'bg-primary/10 border-primary border'
                  : 'bg-surface border border-outline-variant',
              )}
            >
              <span
                className={cn(
                  'text-title-md font-bold',
                  isMe ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                {entry.rank}
              </span>
              <span className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={entry.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-surface-container-high text-on-surface text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-body-sm text-on-surface">
                  {entry.displayName ?? t('challenges.memberFallbackName')}
                  {isMe && ` ${t('challenges.youIndicator')}`}
                </span>
              </span>
              <span className="text-body-lg text-on-surface text-right font-semibold">
                <ScoreCell
                  entry={entry}
                  taskKind={taskLeaderboard.kind}
                  unitLabel={unitLabel}
                />
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function LeaderboardTable({
  groupId,
  challengeId,
  currentUserId,
  isActive,
}: LeaderboardTableProps) {
  const { t } = useTranslation();
  const leaderboardQuery = useLeaderboardQuery(groupId, challengeId, isActive);

  if (leaderboardQuery.isPending) {
    return <LoadingState label={t('challenges.loadingLeaderboardLabel')} />;
  }

  if (leaderboardQuery.isError) {
    return <ErrorState error={leaderboardQuery.error} />;
  }

  if (leaderboardQuery.data.length === 0) {
    return (
      <EmptyState title={t('challenges.noMembersYetTitle')} icon={Trophy} />
    );
  }

  const taskLeaderboards = leaderboardQuery.data;

  return (
    <div className="bg-surface-container border-outline-variant/10 rounded-lg border p-6">
      <div className="border-outline-variant mb-4 flex items-center justify-between border-b pb-4">
        <p className="text-title-md text-on-surface flex items-center gap-2">
          <Trophy className="text-neon-cyan size-5" />
          {t('challenges.leaderboardTitle')}
        </p>
      </div>

      <Tabs defaultValue={taskLeaderboards[0].challengeTaskId}>
        {/* A challenge can have many tasks, so this tab bar has to wrap.
            `h-auto!` is load-bearing: TabsList hardcodes
            `group-data-horizontal/tabs:h-8`, and tailwind-merge can't dedupe a
            variant-prefixed `h-8` against a bare `h-auto`, so both survive and
            the 32px one wins — pinning the list at one row's height while the
            wrapped tabs spill over the table below. Same story on the trigger,
            whose `h-[calc(100%-1px)]` resolves against the now multi-row list. */}
        <TabsList className="mb-4 h-auto! flex-wrap justify-start gap-1">
          {taskLeaderboards.map((taskLeaderboard) => (
            <TabsTrigger
              key={taskLeaderboard.challengeTaskId}
              value={taskLeaderboard.challengeTaskId}
              className="h-auto! flex-none px-3 py-1.5"
            >
              {taskLeaderboard.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {taskLeaderboards.map((taskLeaderboard) => (
          <TabsContent
            key={taskLeaderboard.challengeTaskId}
            value={taskLeaderboard.challengeTaskId}
          >
            <TaskLeaderboardPanel
              taskLeaderboard={taskLeaderboard}
              currentUserId={currentUserId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
