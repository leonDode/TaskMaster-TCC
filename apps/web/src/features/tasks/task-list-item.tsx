import { Calendar, MoreVertical, Repeat } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  categoryTint,
  FALLBACK_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import type { Category } from '@/features/categories/types';
import { useToggleOccurrenceMutation } from '@/features/occurrences/use-toggle-occurrence-mutation';
import { QuantitativeProgressWidget } from '@/features/tasks/quantitative-progress-widget';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import {
  useCorrectProgressValueMutation,
  useIncrementProgressMutation,
} from '@/features/tasks/use-progress-mutations';
import { useDeleteTaskMutation } from '@/features/tasks/use-task-mutations';
import type { Task, TaskOccurrence } from '@/features/tasks/types';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

const RECURRENCE_LABEL_KEY: Record<string, string> = {
  DAILY: 'tasks.modeDaily',
  WEEKLY: 'tasks.modeWeekly',
  MONTHLY: 'tasks.modeMonthly',
  YEARLY: 'tasks.modeYearly',
};

interface TaskListItemProps {
  task: Task;
  category?: Category;
  /** This task's occurrence for today, if it has one (drives the checkbox). */
  todayOccurrence?: TaskOccurrence;
  today: string;
}

export function TaskListItem({
  task,
  category,
  todayOccurrence,
  today,
}: TaskListItemProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const deleteTask = useDeleteTaskMutation();

  const occurrencesQueryKey = ['occurrences', { from: today, to: today }];
  const toggleCompletion = useToggleOccurrenceMutation(occurrencesQueryKey);
  const incrementProgress = useIncrementProgressMutation(occurrencesQueryKey);
  const correctProgress = useCorrectProgressValueMutation(occurrencesQueryKey);

  const canToggle = !!todayOccurrence;
  const isDone = todayOccurrence?.completed ?? false;
  const isQuantitative = task.kind === 'QUANTITATIVE';

  const toggle = () => {
    toggleCompletion.mutate({ taskId: task.id, date: today, checked: !isDone });
  };

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

  const dueDateChip = task.dueDate && (
    <span className="text-on-surface-variant text-body-sm flex items-center gap-1">
      <Calendar className="size-3.5" />
      {task.dueDate.slice(0, 10)}
    </span>
  );

  const recurrenceChip = (
    <span className="text-on-surface-variant text-body-sm flex items-center gap-1">
      <Repeat className="size-3.5" />
      {task.recurrenceFrequency
        ? t(RECURRENCE_LABEL_KEY[task.recurrenceFrequency])
        : t('tasks.modeOnce')}
    </span>
  );

  return (
    <div className="bg-card border-outline-variant/20 hover:border-primary/40 flex items-center gap-4 rounded-lg border p-4 transition-all">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-title-md font-bold! text-on-surface truncate',
            isDone && 'text-on-surface-variant line-through',
          )}
        >
          {task.title}
        </p>
        {/* Both kinds share the same shape: title, then the toggle (checkbox
            or progress ring) leading a row that ends with the category. */}
        {!isQuantitative && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canToggle}
              onClick={toggle}
              title={!canToggle ? t('tasks.notDueToday') : undefined}
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                isDone
                  ? 'bg-neon-cyan border-neon-cyan'
                  : 'border-outline hover:border-primary',
                !canToggle && 'cursor-not-allowed opacity-30',
              )}
            >
              {isDone && (
                <span className="text-surface-container-lowest text-xs font-bold">
                  ✓
                </span>
              )}
            </button>
            {dueDateChip}
            {recurrenceChip}
            {categoryChip}
          </div>
        )}
        {isQuantitative && canToggle && todayOccurrence && (
          <div className="mt-1">
            <QuantitativeProgressWidget
              currentValue={todayOccurrence.currentValue}
              targetValue={todayOccurrence.targetValue}
              unit={todayOccurrence.unit}
              completed={isDone}
              incrementPending={incrementProgress.isPending}
              correctPending={correctProgress.isPending}
              onIncrement={(delta) =>
                incrementProgress.mutate({
                  taskId: task.id,
                  date: today,
                  delta,
                })
              }
              onCorrectValue={(value) =>
                correctProgress.mutate({ taskId: task.id, date: today, value })
              }
              trailing={
                <>
                  {dueDateChip}
                  {recurrenceChip}
                  {categoryChip}
                </>
              }
            />
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface p-2"
          >
            <MoreVertical className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            {t('tasks.editAction')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => deleteTask.mutate(task.id)}
          >
            {t('tasks.deleteAction')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </div>
  );
}
