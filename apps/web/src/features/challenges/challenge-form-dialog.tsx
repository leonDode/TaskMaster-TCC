import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { TASK_KINDS, UNIT_TYPES } from '@task-master/shared';
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
import type { Challenge } from '@/features/challenges/types';
import {
  useCreateChallengeMutation,
  useUpdateChallengeMutation,
} from '@/features/challenges/use-challenge-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';

const taskSchema = z
  .object({
    title: z.string().min(1, 'Task title is required.'),
    kind: z.enum(TASK_KINDS),
    targetValue: z.number().positive().optional(),
    unit: z.enum(UNIT_TYPES).optional(),
  })
  .superRefine((values, ctx) => {
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

const schema = z
  .object({
    title: z.string().min(1, 'Title is required.').max(120),
    description: z.string().max(500).optional().or(z.literal('')),
    startAt: z.string().min(1, 'Start date is required.'),
    endAt: z.string().min(1, 'End date is required.'),
    tasks: z.array(taskSchema).min(1, 'Add at least one task.'),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'End date must be after start date.',
    path: ['endAt'],
  });

type Input_ = z.infer<typeof schema>;

function toLocalInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

interface ChallengeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  challenge?: Challenge;
}

export function ChallengeFormDialog({
  open,
  onOpenChange,
  groupId,
  challenge,
}: ChallengeFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!challenge;
  const createChallenge = useCreateChallengeMutation(groupId);
  const updateChallenge = useUpdateChallengeMutation(
    groupId,
    challenge?.id ?? '',
  );
  const pending = createChallenge.isPending || updateChallenge.isPending;

  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      tasks: [{ title: '', kind: 'BOOLEAN' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });
  const taskKinds = useWatch({ control: form.control, name: 'tasks' });

  useEffect(() => {
    if (open) {
      form.reset({
        title: challenge?.title ?? '',
        description: challenge?.description ?? '',
        startAt: toLocalInputValue(challenge?.startAt),
        endAt: toLocalInputValue(challenge?.endAt),
        tasks: [{ title: '', kind: 'BOOLEAN' }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, challenge]);

  function onSubmit(values: Input_) {
    const onSuccess = () => onOpenChange(false);
    if (isEditing) {
      updateChallenge.mutate(
        {
          title: values.title,
          description: values.description || undefined,
          startAt: new Date(values.startAt).toISOString(),
          endAt: new Date(values.endAt).toISOString(),
        },
        { onSuccess },
      );
      return;
    }
    createChallenge.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        tasks: values.tasks.map((t) => ({
          title: t.title,
          kind: t.kind,
          targetValue: t.kind === 'QUANTITATIVE' ? t.targetValue : undefined,
          unit: t.kind === 'QUANTITATIVE' ? t.unit : undefined,
        })),
      },
      { onSuccess },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-h-[85vh] max-w-2xl overflow-y-auto rounded-lg border border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-headline-lg-mobile text-on-surface">
            {isEditing
              ? t('challenges.editChallengeTitle')
              : t('challenges.newChallengeTitle')}
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
                    {t('challenges.challengeTitleLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-input rounded-lg"
                      placeholder={t('challenges.challengeTitlePlaceholder')}
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
                    {t('challenges.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea className="bg-input rounded-lg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-gutter">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                      {t('challenges.startDateLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="bg-input rounded-lg [color-scheme:dark]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                      {t('challenges.endDateLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="bg-input rounded-lg [color-scheme:dark]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEditing && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-label-caps text-on-surface-variant uppercase">
                    {t('challenges.challengeTasksLabel')}
                  </p>
                  <span className="bg-surface-container-high text-on-surface-variant text-label-caps rounded-full px-2 py-0.5">
                    {t('challenges.taskCount', { count: fields.length })}
                  </span>
                </div>
                <div className="space-y-3">
                  {fields.map((taskField, index) => (
                    <div
                      key={taskField.id}
                      className="border-outline-variant/10 space-y-2 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`tasks.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  className="bg-input rounded-lg"
                                  placeholder={t('challenges.taskPlaceholder', {
                                    number: index + 1,
                                  })}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`tasks.${index}.kind`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-input w-36 rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TASK_KINDS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {t(`tasks.kindOptions.${option}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="text-on-surface-variant hover:text-destructive p-2 disabled:opacity-30"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {taskKinds?.[index]?.kind === 'QUANTITATIVE' && (
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.targetValue`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    className="bg-input rounded-lg"
                                    placeholder={t('tasks.targetValueLabel')}
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
                            name={`tasks.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
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
                                    {UNIT_TYPES.map((unit) => (
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
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => append({ title: '', kind: 'BOOLEAN' })}
                  className="text-neon-cyan mt-2 flex items-center gap-1 text-sm"
                >
                  <Plus className="size-4" />
                  {t('challenges.addTaskButton')}
                </button>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('challenges.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {isEditing
                  ? t('challenges.saveChangesButton')
                  : t('challenges.createChallengeSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
