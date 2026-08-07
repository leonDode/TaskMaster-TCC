import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  TASK_KINDS,
  UNIT_TYPES,
  unitsForCategoryType,
  type CategoryType,
} from '@task-master/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCategoriesQuery } from '@/features/categories/use-categories-query';
import { RecurrenceFields } from '@/features/tasks/recurrence-fields';
import { RecurrencePreview } from '@/features/tasks/recurrence-preview';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from '@/features/tasks/use-task-mutations';
import type { Task } from '@/features/tasks/types';
import { useTranslation } from '@/lib/i18n/use-translation';

const NO_CATEGORY = 'none';

const schema = z
  .object({
    title: z.string().min(1, 'Title is required.').max(200),
    description: z.string().max(2000).optional().or(z.literal('')),
    categoryId: z.string(),
    kind: z.enum(TASK_KINDS),
    targetValue: z.number().positive().optional(),
    unit: z.enum(UNIT_TYPES).optional(),
    mode: z.enum(['once', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    dueDate: z.string().optional().or(z.literal('')),
    recurrenceDaysOfWeek: z.array(z.number()).optional(),
    recurrenceDayOfMonth: z.number().optional(),
    recurrenceMonth: z.number().optional(),
    recurrenceStartDate: z.string().optional().or(z.literal('')),
    recurrenceEndDate: z.string().optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'WEEKLY' && !values.recurrenceDaysOfWeek?.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick at least one day of week.',
        path: ['recurrenceDaysOfWeek'],
      });
    }
    if (
      (values.mode === 'MONTHLY' || values.mode === 'YEARLY') &&
      !values.recurrenceDayOfMonth
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Day of month is required.',
        path: ['recurrenceDayOfMonth'],
      });
    }
    if (values.mode === 'YEARLY' && !values.recurrenceMonth) {
      ctx.addIssue({
        code: 'custom',
        message: 'Month is required.',
        path: ['recurrenceMonth'],
      });
    }
    if (values.mode !== 'once' && !values.recurrenceStartDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Start date is required.',
        path: ['recurrenceStartDate'],
      });
    }
    if (values.kind === 'QUANTITATIVE' && !values.targetValue) {
      ctx.addIssue({
        code: 'custom',
        message: 'Target value is required.',
        path: ['targetValue'],
      });
    }
    if (values.kind === 'QUANTITATIVE' && !values.unit) {
      ctx.addIssue({
        code: 'custom',
        message: 'Unit is required.',
        path: ['unit'],
      });
    }
  });

export type TaskFormValues = z.infer<typeof schema>;

const MODE_OPTIONS = [
  { value: 'once', labelKey: 'tasks.modeOnce' },
  { value: 'DAILY', labelKey: 'tasks.modeDaily' },
  { value: 'WEEKLY', labelKey: 'tasks.modeWeekly' },
  { value: 'MONTHLY', labelKey: 'tasks.modeMonthly' },
  { value: 'YEARLY', labelKey: 'tasks.modeYearly' },
] as const;

function toDefaultValues(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    categoryId: task?.categoryId ?? NO_CATEGORY,
    kind: task?.kind ?? 'BOOLEAN',
    targetValue: task?.targetValue ?? undefined,
    unit: task?.unit ?? undefined,
    mode: task ? (task.recurrenceFrequency ?? 'once') : 'once',
    dueDate: task?.dueDate?.slice(0, 10) ?? '',
    recurrenceDaysOfWeek: task?.recurrenceDaysOfWeek ?? [],
    recurrenceDayOfMonth: task?.recurrenceDayOfMonth ?? undefined,
    recurrenceMonth: task?.recurrenceMonth ?? undefined,
    recurrenceStartDate: task?.recurrenceStartDate?.slice(0, 10) ?? '',
    recurrenceEndDate: task?.recurrenceEndDate?.slice(0, 10) ?? '',
  };
}

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultCategoryId?: string;
  defaultDueDate?: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultCategoryId,
  defaultDueDate,
}: TaskFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!task;
  const { data: categories } = useCategoriesQuery();
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const pending = createTask.isPending || updateTask.isPending;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(task),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...toDefaultValues(task),
        categoryId: task?.categoryId ?? defaultCategoryId ?? NO_CATEGORY,
        dueDate: task?.dueDate?.slice(0, 10) ?? defaultDueDate ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const mode = useWatch({ control: form.control, name: 'mode' });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const watchedCategoryId = useWatch({
    control: form.control,
    name: 'categoryId',
  });
  const selectedCategoryType: CategoryType =
    categories?.find((c) => c.id === watchedCategoryId)?.type ?? 'OTHER';
  const unitOptions = unitsForCategoryType(selectedCategoryType);
  const daysOfWeek = useWatch({
    control: form.control,
    name: 'recurrenceDaysOfWeek',
  });
  const dayOfMonth = useWatch({
    control: form.control,
    name: 'recurrenceDayOfMonth',
  });
  const month = useWatch({ control: form.control, name: 'recurrenceMonth' });
  const startDate = useWatch({
    control: form.control,
    name: 'recurrenceStartDate',
  });
  const endDate = useWatch({
    control: form.control,
    name: 'recurrenceEndDate',
  });

  function onSubmit(values: TaskFormValues) {
    const categoryId =
      values.categoryId === NO_CATEGORY ? undefined : values.categoryId;
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateTask.mutate(
        {
          id: task.id,
          input: {
            title: values.title,
            description: values.description || undefined,
            categoryId: categoryId ?? null,
            targetValue:
              values.kind === 'QUANTITATIVE' ? values.targetValue : undefined,
            unit: values.kind === 'QUANTITATIVE' ? values.unit : undefined,
            dueDate:
              values.mode === 'once' ? values.dueDate || undefined : undefined,
            recurrenceDaysOfWeek:
              values.mode === 'WEEKLY'
                ? values.recurrenceDaysOfWeek
                : undefined,
            recurrenceDayOfMonth:
              values.mode === 'MONTHLY' || values.mode === 'YEARLY'
                ? values.recurrenceDayOfMonth
                : undefined,
            recurrenceMonth:
              values.mode === 'YEARLY' ? values.recurrenceMonth : undefined,
            recurrenceStartDate:
              values.mode !== 'once' ? values.recurrenceStartDate : undefined,
            recurrenceEndDate:
              values.mode !== 'once'
                ? values.recurrenceEndDate || undefined
                : undefined,
          },
        },
        { onSuccess },
      );
      return;
    }

    createTask.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        categoryId,
        kind: values.kind,
        targetValue:
          values.kind === 'QUANTITATIVE' ? values.targetValue : undefined,
        unit: values.kind === 'QUANTITATIVE' ? values.unit : undefined,
        dueDate:
          values.mode === 'once' ? values.dueDate || undefined : undefined,
        recurrenceFrequency: values.mode === 'once' ? undefined : values.mode,
        recurrenceDaysOfWeek:
          values.mode === 'WEEKLY' ? values.recurrenceDaysOfWeek : undefined,
        recurrenceDayOfMonth:
          values.mode === 'MONTHLY' || values.mode === 'YEARLY'
            ? values.recurrenceDayOfMonth
            : undefined,
        recurrenceMonth:
          values.mode === 'YEARLY' ? values.recurrenceMonth : undefined,
        recurrenceStartDate:
          values.mode !== 'once' ? values.recurrenceStartDate : undefined,
        recurrenceEndDate:
          values.mode !== 'once'
            ? values.recurrenceEndDate || undefined
            : undefined,
      },
      { onSuccess },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-2xl rounded-lg border border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-headline-lg-mobile text-on-surface">
            {isEditing ? t('tasks.editTaskTitle') : t('tasks.createTaskTitle')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-gutter"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('tasks.taskTitleLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-input rounded-lg"
                      placeholder={t('tasks.taskTitlePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('tasks.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="bg-input rounded-lg"
                      placeholder={t('tasks.descriptionPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                      {t('tasks.categoryLabel')}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-input w-full rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>
                          {t('tasks.noCategory')}
                        </SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === 'once' && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                        {t('tasks.dueDateLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-input rounded-lg [color-scheme:dark]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('tasks.kindLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="border-input flex overflow-hidden rounded-lg border">
                      {TASK_KINDS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={isEditing}
                          onClick={() => field.onChange(option)}
                          className={cn(
                            'text-body-sm flex-1 border-r border-outline-variant py-3 text-center transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50',
                            field.value === option
                              ? 'bg-primary-container text-on-primary-container font-bold'
                              : 'text-on-surface-variant hover:bg-surface-variant',
                          )}
                        >
                          {t(`tasks.kindOptions.${option}`)}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {isEditing && (
                    <p className="text-body-sm text-on-surface-variant">
                      {t('tasks.kindLockedNote')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {kind === 'QUANTITATIVE' && (
              <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                        {t('tasks.targetValueLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          className="bg-input rounded-lg"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                        {t('tasks.unitLabel')}
                      </FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-input w-full rounded-lg">
                            <SelectValue
                              placeholder={t('tasks.unitPlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {t(`units.${unit}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('tasks.recurrenceLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="border-input flex flex-wrap overflow-hidden rounded-lg border">
                      {MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isEditing}
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'text-body-sm flex-1 border-r border-outline-variant py-3 text-center transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50',
                            field.value === option.value
                              ? 'bg-primary-container text-on-primary-container font-bold'
                              : 'text-on-surface-variant hover:bg-surface-variant',
                          )}
                        >
                          {t(option.labelKey)}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {isEditing && (
                    <p className="text-body-sm text-on-surface-variant">
                      {t('tasks.recurrenceLockedNote')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode !== 'once' && (
              <>
                <RecurrenceFields control={form.control} frequency={mode} />
                <RecurrencePreview
                  frequency={mode}
                  daysOfWeek={daysOfWeek}
                  dayOfMonth={dayOfMonth}
                  month={month}
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('tasks.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {isEditing
                  ? t('tasks.saveChangesButton')
                  : t('tasks.createTaskButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
