import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  TASK_KINDS,
  UNIT_TYPES,
  type TaskKind,
  type UnitType,
} from '@task-master/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuantitativeProgressWidget } from '@/features/tasks/quantitative-progress-widget';
import type {
  ChallengeTask,
  ChallengeTaskProgress,
} from '@/features/challenges/types';
import {
  useAddChallengeTaskMutation,
  useRemoveChallengeTaskMutation,
  useToggleChallengeTaskCompletion,
} from '@/features/challenges/use-challenge-mutations';
import { useIncrementChallengeProgressMutation } from '@/features/challenges/use-challenge-progress-mutation';
import { useTranslation } from '@/lib/i18n/use-translation';
import { sortIncompleteFirst } from '@/lib/sort-by-completion';
import { cn } from '@/lib/utils';

interface ChallengeTaskListProps {
  groupId: string;
  challengeId: string;
  tasks: ChallengeTask[];
  progressByTaskId: Map<string, ChallengeTaskProgress>;
  isOwner: boolean;
  canComplete: boolean;
}

export function ChallengeTaskList({
  groupId,
  challengeId,
  tasks,
  progressByTaskId,
  isOwner,
  canComplete,
}: ChallengeTaskListProps) {
  const { t } = useTranslation();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskKind, setNewTaskKind] = useState<TaskKind>('BOOLEAN');
  const [newTaskTargetValue, setNewTaskTargetValue] = useState('');
  const [newTaskUnit, setNewTaskUnit] = useState<UnitType | ''>('');
  const addTask = useAddChallengeTaskMutation(groupId, challengeId);
  const removeTask = useRemoveChallengeTaskMutation(groupId, challengeId);
  const toggleCompletion = useToggleChallengeTaskCompletion(
    groupId,
    challengeId,
  );
  const incrementProgress = useIncrementChallengeProgressMutation(
    groupId,
    challengeId,
  );

  return (
    <div className="bg-surface-container border-outline-variant/10 rounded-lg border p-6">
      <p className="text-title-md text-on-surface mb-4">
        {t('challenges.challengeTasksListTitle')}
      </p>
      <div className="flex flex-col gap-3">
        {sortIncompleteFirst(
          tasks,
          (task) => progressByTaskId.get(task.id)?.completedToday ?? false,
        ).map((task) => {
          const progress = progressByTaskId.get(task.id);
          const isDone = progress?.completedToday ?? false;
          return (
            <div
              key={task.id}
              className="bg-surface border-outline-variant/10 flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-1 items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-on-surface text-sm font-bold',
                      isDone && 'text-on-surface-variant line-through',
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-on-surface-variant text-xs">
                      {task.description}
                    </p>
                  )}
                  {task.kind === 'BOOLEAN' && (
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={!canComplete}
                        onClick={() =>
                          toggleCompletion.mutate({
                            taskId: task.id,
                            checked: !isDone,
                          })
                        }
                        title={
                          !canComplete
                            ? t('challenges.outsideWindowTitle')
                            : undefined
                        }
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          isDone
                            ? 'bg-primary border-primary'
                            : 'border-primary hover:bg-primary/10',
                          !canComplete && 'cursor-not-allowed opacity-30',
                        )}
                      >
                        {isDone && (
                          <span className="text-xs font-bold text-white">
                            ✓
                          </span>
                        )}
                      </button>
                      {progress && (
                        <p className="text-neon-cyan text-xs">
                          {t('challenges.completionsTotal', {
                            count: progress.totalCompletions,
                          })}
                        </p>
                      )}
                    </div>
                  )}
                  {task.kind === 'QUANTITATIVE' && (
                    <div className="mt-1">
                      <QuantitativeProgressWidget
                        currentValue={progress?.valueToday ?? 0}
                        targetValue={task.targetValue}
                        unit={task.unit}
                        completed={isDone}
                        incrementPending={
                          incrementProgress.isPending || !canComplete
                        }
                        onIncrement={(delta) =>
                          incrementProgress.mutate({ taskId: task.id, delta })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => removeTask.mutate(task.id)}
                  className="text-on-surface-variant hover:text-destructive p-2"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskTitle.trim()) return;
            if (
              newTaskKind === 'QUANTITATIVE' &&
              (!newTaskTargetValue || !newTaskUnit)
            ) {
              return;
            }
            addTask.mutate(
              {
                title: newTaskTitle.trim(),
                kind: newTaskKind,
                targetValue:
                  newTaskKind === 'QUANTITATIVE'
                    ? Number(newTaskTargetValue)
                    : undefined,
                unit:
                  newTaskKind === 'QUANTITATIVE' && newTaskUnit
                    ? newTaskUnit
                    : undefined,
              },
              {
                onSuccess: () => {
                  setNewTaskTitle('');
                  setNewTaskKind('BOOLEAN');
                  setNewTaskTargetValue('');
                  setNewTaskUnit('');
                },
              },
            );
          }}
          className="mt-4 space-y-2"
        >
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('challenges.newTaskPlaceholder')}
              className="bg-input rounded-lg"
            />
            <Select
              value={newTaskKind}
              onValueChange={(v) => setNewTaskKind(v as TaskKind)}
            >
              <SelectTrigger className="bg-input w-36 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_KINDS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`tasks.kindOptions.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={addTask.isPending} size="icon">
              <Plus className="size-4" />
            </Button>
          </div>
          {newTaskKind === 'QUANTITATIVE' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={newTaskTargetValue}
                onChange={(e) => setNewTaskTargetValue(e.target.value)}
                placeholder={t('tasks.targetValueLabel')}
                className="bg-input rounded-lg"
              />
              <Select
                value={newTaskUnit}
                onValueChange={(v) => setNewTaskUnit(v as UnitType)}
              >
                <SelectTrigger className="bg-input w-full rounded-lg">
                  <SelectValue placeholder={t('tasks.unitPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`units.${unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
