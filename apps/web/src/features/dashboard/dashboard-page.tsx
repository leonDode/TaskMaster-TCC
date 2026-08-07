import { CheckCircle2, Plus, Sun, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import {
  categoryTint,
  FALLBACK_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import { useCategoriesQuery } from '@/features/categories/use-categories-query';
import { ConsistencyHeatmap } from '@/features/dashboard/consistency-heatmap';
import { DailyProgressRing } from '@/features/dashboard/daily-progress-ring';
import { useToggleOccurrenceMutation } from '@/features/occurrences/use-toggle-occurrence-mutation';
import { getOccurrences } from '@/features/tasks/api';
import { QuantitativeProgressWidget } from '@/features/tasks/quantitative-progress-widget';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import {
  useCorrectProgressValueMutation,
  useIncrementProgressMutation,
} from '@/features/tasks/use-progress-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';
import { sortIncompleteFirst } from '@/lib/sort-by-completion';
import { cn } from '@/lib/utils';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { t, locale } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const today = todayIsoDate();
  const queryKey = ['occurrences', { from: today, to: today }];

  const occurrencesQuery = useQuery({
    queryKey,
    queryFn: () => getOccurrences({ from: today, to: today }),
  });
  const { data: categories } = useCategoriesQuery();
  const toggleCompletion = useToggleOccurrenceMutation(queryKey);
  const incrementProgress = useIncrementProgressMutation(queryKey);
  const correctProgress = useCorrectProgressValueMutation(queryKey);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const occurrences = occurrencesQuery.data ?? [];
  const visible = sortIncompleteFirst(
    categoryId
      ? occurrences.filter((o) => o.categoryId === categoryId)
      : occurrences,
    (o) => o.completed,
  );
  const doneCount = occurrences.filter((o) => o.completed).length;

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={new Date().toLocaleDateString(
          locale === 'pt-BR' ? 'pt-BR' : undefined,
          {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          },
        )}
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
          >
            <Plus className="size-4" />
            {t('dashboard.newTask')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-12 grid grid-cols-1 gap-gutter md:grid-cols-2">
            {/* Ring carries the ratio, the figure beside it carries the raw
                count — complementary, not the same number twice. */}
            <div className="bg-card border-outline-variant/40 relative flex items-center gap-5 overflow-hidden rounded-xl border p-6">
              <DailyProgressRing done={doneCount} total={occurrences.length} />
              <div className="min-w-0">
                <p className="text-label-caps text-on-surface-variant mb-2 uppercase">
                  {t('dashboard.tasksToday')}
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-display-lg text-neon-cyan">
                    {doneCount}
                  </span>
                  <span className="text-title-md text-on-surface-variant mb-2">
                    / {occurrences.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card border-outline-variant/40 relative overflow-hidden rounded-xl border p-6">
              <Tag className="text-tertiary absolute top-0 right-0 size-16 p-4 opacity-10" />
              <p className="text-label-caps text-on-surface-variant mb-2 uppercase">
                {t('dashboard.categories')}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-display-lg text-tertiary">
                  {categories?.length ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setCategoryId(undefined)}
              className={cn(
                'text-body-sm rounded-full border px-6 py-2 transition-all',
                categoryId === undefined
                  ? 'bg-primary-container text-on-primary-container border-primary-container font-bold'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface',
              )}
            >
              {t('dashboard.allFilter')}
            </button>
            {categories?.map((category) => (
              <button
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                className="text-body-sm rounded-full border px-6 py-2 transition-all"
                style={
                  categoryId === category.id
                    ? {
                        backgroundColor: categoryTint(category.color, 20),
                        borderColor: category.color ?? FALLBACK_CATEGORY_COLOR,
                        color: category.color ?? FALLBACK_CATEGORY_COLOR,
                        fontWeight: 700,
                      }
                    : { borderColor: 'var(--outline-variant)' }
                }
              >
                {category.name}
              </button>
            ))}
          </div>

          <h2 className="text-headline-lg text-on-surface mb-6 flex items-center gap-3">
            <Sun className="text-primary size-6" />
            {t('dashboard.todaysFocus')}
          </h2>

          {occurrencesQuery.isPending ? (
            <LoadingState label={t('dashboard.loadingLabel')} />
          ) : occurrencesQuery.isError ? (
            <ErrorState
              error={occurrencesQuery.error}
              onRetry={() => occurrencesQuery.refetch()}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title={t('dashboard.emptyTitle')}
              description={t('dashboard.emptyDescription')}
              icon={CheckCircle2}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  {t('dashboard.newTask')}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((occurrence) => {
                const category = occurrence.categoryId
                  ? categoryById.get(occurrence.categoryId)
                  : undefined;
                // Both task kinds share the same shape: title on the first line,
                // then the toggle (checkbox or progress ring) leading a single
                // row that ends with the category chip.
                const categoryChip = category && (
                  <span
                    className="text-label-caps rounded-full px-3 py-1"
                    style={{
                      backgroundColor: categoryTint(category.color, 15),
                      color: category.color ?? FALLBACK_CATEGORY_COLOR,
                    }}
                  >
                    {category.name}
                  </span>
                );
                return (
                  <div
                    key={occurrence.taskId}
                    className={cn(
                      'bg-card border-outline-variant/60 hover:border-primary/40 flex items-center gap-6 rounded-xl border p-5 transition-colors',
                      occurrence.completed && 'opacity-60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-title-md font-bold! text-on-surface mb-1',
                          occurrence.completed && 'line-through',
                        )}
                      >
                        {occurrence.title}
                      </p>
                      {occurrence.kind === 'BOOLEAN' && (
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleCompletion.mutate({
                                taskId: occurrence.taskId,
                                date: today,
                                checked: !occurrence.completed,
                              })
                            }
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                              occurrence.completed
                                ? 'bg-neon-cyan border-neon-cyan'
                                : 'border-outline hover:border-primary',
                            )}
                          >
                            {occurrence.completed && (
                              <span className="text-surface-container-lowest text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                          {categoryChip}
                        </div>
                      )}
                      {occurrence.kind === 'QUANTITATIVE' && (
                        <div className="mt-1">
                          <QuantitativeProgressWidget
                            currentValue={occurrence.currentValue}
                            targetValue={occurrence.targetValue}
                            unit={occurrence.unit}
                            completed={occurrence.completed}
                            incrementPending={incrementProgress.isPending}
                            correctPending={correctProgress.isPending}
                            onIncrement={(delta) =>
                              incrementProgress.mutate({
                                taskId: occurrence.taskId,
                                date: today,
                                delta,
                              })
                            }
                            onCorrectValue={(value) =>
                              correctProgress.mutate({
                                taskId: occurrence.taskId,
                                date: today,
                                value,
                              })
                            }
                            trailing={categoryChip}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-gutter">
          <ConsistencyHeatmap />
        </aside>
      </div>

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
