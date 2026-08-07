import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import type { ChallengeTaskProgress } from '@/features/challenges/types';
import { useMyProgressQuery } from '@/features/challenges/use-challenges-queries';
import { useTranslation } from '@/lib/i18n/use-translation';

interface MyProgressPanelProps {
  groupId: string;
  challengeId: string;
  totalDays: number;
}

function TaskProgressCard({ progress }: { progress: ChallengeTaskProgress }) {
  const { t } = useTranslation();

  if (progress.kind === 'BOOLEAN') {
    return (
      <div className="bg-surface border-neon-cyan/20 rounded-lg border p-4">
        <p className="text-body-sm text-on-surface-variant mb-1">
          {progress.title}
        </p>
        <p className="text-neon-cyan text-2xl font-bold">
          {t('challenges.completionsTotal', {
            count: progress.totalCompletions,
          })}
        </p>
      </div>
    );
  }

  const unitLabel = progress.unit ? t(`units.${progress.unit}`) : '';
  const valueToday = progress.valueToday ?? 0;
  const target = progress.targetValue ?? 0;
  const percent = target > 0 ? Math.min(100, (valueToday / target) * 100) : 0;

  return (
    <div className="bg-surface border-neon-cyan/20 rounded-lg border p-4">
      <p className="text-body-sm text-on-surface-variant mb-1">
        {progress.title}
      </p>
      <p className="text-neon-cyan text-2xl font-bold">
        {valueToday}
        {target > 0 ? ` / ${target}` : ''} {unitLabel}
      </p>
      <p className="text-label-caps text-on-surface-variant mt-1 uppercase">
        {t('challenges.progressTodayLabel')}
      </p>
      <div className="bg-surface-container-high mt-2 h-1 w-full rounded-full">
        <div
          className="bg-neon-cyan h-1 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function MyProgressPanel({
  groupId,
  challengeId,
}: MyProgressPanelProps) {
  const { t } = useTranslation();
  const progressQuery = useMyProgressQuery(groupId, challengeId);

  if (progressQuery.isPending) {
    return <LoadingState label={t('challenges.loadingProgressLabel')} />;
  }

  if (progressQuery.isError) {
    return <ErrorState error={progressQuery.error} />;
  }

  return (
    <div className="bg-surface-container border-outline-variant/10 rounded-lg border p-6">
      <p className="text-title-md text-on-surface mb-4">
        {t('challenges.myProgressTitle')}
      </p>
      <div className="flex flex-col gap-3">
        {progressQuery.data.map((progress) => (
          <TaskProgressCard
            key={progress.challengeTaskId}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
}
