import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
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
import { getOccurrences } from '@/features/tasks/api';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import { TaskListItem } from '@/features/tasks/task-list-item';
import { useTasksQuery } from '@/features/tasks/use-tasks-query';
import type { TaskOccurrence } from '@/features/tasks/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n/use-translation';
import { sortIncompleteFirst } from '@/lib/sort-by-completion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TasksPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get('new') === '1',
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: categories } = useCategoriesQuery();
  const filters = useMemo(
    () => ({ categoryId, page, pageSize: PAGE_SIZE }),
    [categoryId, page],
  );
  const tasksQuery = useTasksQuery(filters);

  const today = todayIsoDate();
  const todayOccurrencesQuery = useQuery({
    queryKey: ['occurrences', { from: today, to: today }],
    queryFn: () => getOccurrences({ from: today, to: today }),
  });

  const occurrenceByTaskId = useMemo(() => {
    const map = new Map<string, TaskOccurrence>();
    for (const occurrence of todayOccurrencesQuery.data ?? []) {
      map.set(occurrence.taskId, occurrence);
    }
    return map;
  }, [todayOccurrencesQuery.data]);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const totalPages = tasksQuery.data
    ? Math.max(1, Math.ceil(tasksQuery.data.total / PAGE_SIZE))
    : 1;

  const sortedItems = useMemo(() => {
    const items = tasksQuery.data?.items ?? [];
    return sortIncompleteFirst(
      items,
      (task) => occurrenceByTaskId.get(task.id)?.completed ?? false,
    );
  }, [tasksQuery.data, occurrenceByTaskId]);

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        description={
          tasksQuery.data
            ? t('tasks.taskCount', { count: tasksQuery.data.total })
            : undefined
        }
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
          >
            <Plus className="size-4" />
            {t('tasks.newTask')}
          </Button>
        }
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setCategoryId(undefined);
            setPage(1);
          }}
          className={cn(
            'text-body-sm rounded-full border px-6 py-2 transition-all',
            categoryId === undefined
              ? 'bg-primary-container text-on-primary-container border-primary-container font-bold'
              : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface',
          )}
        >
          {t('tasks.allFilter')}
        </button>
        {categories?.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setCategoryId(category.id);
              setPage(1);
            }}
            className={cn(
              'text-body-sm rounded-full border px-6 py-2 transition-all',
              categoryId === category.id
                ? 'font-bold'
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface',
            )}
            style={
              categoryId === category.id
                ? {
                    backgroundColor: categoryTint(category.color, 20),
                    borderColor: category.color ?? FALLBACK_CATEGORY_COLOR,
                    color: category.color ?? FALLBACK_CATEGORY_COLOR,
                  }
                : undefined
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      {tasksQuery.isPending ? (
        <LoadingState label={t('tasks.loadingLabel')} />
      ) : tasksQuery.isError ? (
        <ErrorState
          error={tasksQuery.error}
          onRetry={() => tasksQuery.refetch()}
        />
      ) : tasksQuery.data.items.length === 0 ? (
        <EmptyState
          title={t('tasks.emptyTitle')}
          description={t('tasks.emptyDescription')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('tasks.newTask')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {sortedItems.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                category={
                  task.categoryId
                    ? categoryById.get(task.categoryId)
                    : undefined
                }
                todayOccurrence={occurrenceByTaskId.get(task.id)}
                today={today}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('tasks.previousPage')}
              </Button>
              <span className="text-body-sm text-on-surface-variant">
                {t('tasks.pageIndicator', { page, totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('tasks.nextPage')}
              </Button>
            </div>
          )}
        </>
      )}

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultCategoryId={categoryId}
      />
    </div>
  );
}
