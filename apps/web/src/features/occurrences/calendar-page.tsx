import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import {
  categoryTint,
  FALLBACK_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import { useCategoriesQuery } from '@/features/categories/use-categories-query';
import { CalendarMonthView } from '@/features/occurrences/calendar-month-view';
import { useOccurrencesQuery } from '@/features/occurrences/use-occurrences-query';
import { useToggleOccurrenceMutation } from '@/features/occurrences/use-toggle-occurrence-mutation';
import { QuantitativeProgressWidget } from '@/features/tasks/quantitative-progress-widget';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import {
  useCorrectProgressValueMutation,
  useIncrementProgressMutation,
} from '@/features/tasks/use-progress-mutations';
import type { TaskOccurrence } from '@/features/tasks/types';
import { getMonthGridDates, startOfMonth, todayIsoDate } from '@/lib/date';
import { useTranslation } from '@/lib/i18n/use-translation';
import { queryKeys } from '@/lib/query-keys';
import { sortIncompleteFirst } from '@/lib/sort-by-completion';
import { cn } from '@/lib/utils';

export function CalendarPage() {
  const { t, locale } = useTranslation();
  const today = todayIsoDate();
  const [year, month] = today.split('-').map(Number);
  const [cursor, setCursor] = useState({ year, month: month - 1 });
  const [selectedDate, setSelectedDate] = useState(today);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const gridDates = useMemo(
    () => getMonthGridDates(cursor.year, cursor.month),
    [cursor],
  );
  const filters = useMemo(
    () => ({
      from: gridDates[0],
      to: gridDates[gridDates.length - 1],
      categoryId,
    }),
    [gridDates, categoryId],
  );

  const { data: categories } = useCategoriesQuery();
  const occurrencesQuery = useOccurrencesQuery(filters);
  const occurrencesQueryKey = queryKeys.occurrences(filters);
  const toggleCompletion = useToggleOccurrenceMutation(occurrencesQueryKey);
  const incrementProgress = useIncrementProgressMutation(occurrencesQueryKey);
  const correctProgress = useCorrectProgressValueMutation(occurrencesQueryKey);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, TaskOccurrence[]>();
    for (const occurrence of occurrencesQuery.data ?? []) {
      const list = map.get(occurrence.occurrenceDate) ?? [];
      list.push(occurrence);
      map.set(occurrence.occurrenceDate, list);
    }
    return map;
  }, [occurrencesQuery.data]);

  const selectedOccurrences = sortIncompleteFirst(
    occurrencesByDate.get(selectedDate) ?? [],
    (o) => o.completed,
  );

  function goToMonth(delta: number) {
    setCursor((prev) => {
      let nextYear = prev.year;
      let nextMonth = prev.month + delta;
      if (nextMonth < 0) {
        nextYear -= 1;
        nextMonth = 11;
      } else if (nextMonth > 11) {
        nextYear += 1;
        nextMonth = 0;
      }
      // The previously selected date is likely outside the new month's
      // fetched range — fall back to "today" if it's in view, else the 1st.
      setSelectedDate(
        nextYear === year && nextMonth === month - 1
          ? today
          : startOfMonth(nextYear, nextMonth),
      );
      return { year: nextYear, month: nextMonth };
    });
  }

  const selectedDateLabel = new Date(
    `${selectedDate}T00:00:00Z`,
  ).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : undefined, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  const monthLabel = new Date(
    Date.UTC(cursor.year, cursor.month, 1),
  ).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <div>
      <PageHeader title={t('occurrences.title')} />

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => setCategoryId(undefined)}
          className={cn(
            'text-label-caps rounded-full border px-6 py-2 uppercase transition-all',
            categoryId === undefined
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-surface-container border-outline-variant/20 text-on-surface-variant',
          )}
        >
          {t('occurrences.allFilter')}
        </button>
        {categories?.map((category) => (
          <button
            key={category.id}
            onClick={() => setCategoryId(category.id)}
            className={cn(
              'text-label-caps flex items-center gap-2 rounded-full border px-6 py-2 uppercase transition-all',
              categoryId === category.id
                ? 'border-2'
                : 'bg-surface-container border-outline-variant/20 text-on-surface-variant',
            )}
            style={
              categoryId === category.id
                ? {
                    borderColor: category.color ?? FALLBACK_CATEGORY_COLOR,
                    color: category.color ?? FALLBACK_CATEGORY_COLOR,
                    backgroundColor: categoryTint(category.color, 10),
                  }
                : undefined
            }
          >
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: category.color ?? FALLBACK_CATEGORY_COLOR,
              }}
            />
            {category.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-gutter lg:flex-row">
        <section className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-headline-lg text-on-surface capitalize">
              {monthLabel} {cursor.year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => goToMonth(-1)}
                className="bg-surface-container-high border-outline-variant/20 text-on-surface-variant hover:text-primary rounded-lg border p-2 transition-colors"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={() => goToMonth(1)}
                className="bg-surface-container-high border-outline-variant/20 text-on-surface-variant hover:text-primary rounded-lg border p-2 transition-colors"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {occurrencesQuery.isPending ? (
            <LoadingState label={t('occurrences.loadingLabel')} />
          ) : occurrencesQuery.isError ? (
            <ErrorState
              error={occurrencesQuery.error}
              onRetry={() => occurrencesQuery.refetch()}
            />
          ) : (
            <CalendarMonthView
              gridDates={gridDates}
              currentMonth={cursor.month}
              occurrencesByDate={occurrencesByDate}
              categoryById={categoryById}
              selectedDate={selectedDate}
              today={today}
              onSelectDate={setSelectedDate}
            />
          )}
        </section>

        <aside className="bg-surface-container-low border-outline-variant/10 flex w-full flex-col rounded-xl border lg:w-96">
          <div className="border-outline-variant/10 border-b p-gutter">
            <h3 className="text-title-md text-on-surface mb-1">
              {selectedDateLabel}
            </h3>
            <p className="text-body-sm text-neon-cyan">
              {t('occurrences.taskCount', {
                count: selectedOccurrences.length,
              })}
            </p>
          </div>

          <div className="flex-1 space-y-4 p-gutter">
            {selectedOccurrences.length === 0 ? (
              <EmptyState
                title={t('occurrences.emptyTitle')}
                description={t('occurrences.emptyDescription')}
              />
            ) : (
              selectedOccurrences.map((occurrence) => {
                const category = occurrence.categoryId
                  ? categoryById.get(occurrence.categoryId)
                  : undefined;
                const categoryChip = category && (
                  <span
                    className="text-label-caps rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase"
                    style={{
                      backgroundColor: categoryTint(category.color, 10),
                      color: category.color ?? FALLBACK_CATEGORY_COLOR,
                    }}
                  >
                    {category.name}
                  </span>
                );
                return (
                  <div
                    key={occurrence.taskId}
                    className="bg-surface-container border-outline-variant/10 hover:border-neon-cyan/30 rounded-xl border p-4 transition-all"
                  >
                    <h4
                      className={cn(
                        'text-body-lg font-bold text-on-surface leading-tight',
                        occurrence.completed &&
                          'text-on-surface/50 line-through',
                      )}
                    >
                      {occurrence.title}
                    </h4>
                    {occurrence.kind === 'BOOLEAN' && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            toggleCompletion.mutate({
                              taskId: occurrence.taskId,
                              date: occurrence.occurrenceDate,
                              checked: !occurrence.completed,
                            })
                          }
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                            occurrence.completed
                              ? 'bg-primary border-primary'
                              : 'border-primary',
                          )}
                        >
                          {occurrence.completed && (
                            <span className="text-[10px] font-bold text-white">
                              ✓
                            </span>
                          )}
                        </button>
                        {categoryChip}
                      </div>
                    )}
                    {occurrence.kind === 'QUANTITATIVE' && (
                      <div className="mt-2">
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
                              date: occurrence.occurrenceDate,
                              delta,
                            })
                          }
                          onCorrectValue={(value) =>
                            correctProgress.mutate({
                              taskId: occurrence.taskId,
                              date: occurrence.occurrenceDate,
                              value,
                            })
                          }
                          trailing={categoryChip}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-surface-container border-outline-variant/10 mt-auto border-t p-gutter">
            <button
              onClick={() => setCreateOpen(true)}
              className="border-outline-variant text-on-surface-variant hover:border-neon-cyan hover:text-neon-cyan flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 transition-all"
            >
              <Plus className="size-4" />
              <span className="text-label-caps uppercase">
                {t('occurrences.addTaskButton')}
              </span>
            </button>
          </div>
        </aside>
      </div>

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDueDate={selectedDate}
        defaultCategoryId={categoryId}
      />
    </div>
  );
}
