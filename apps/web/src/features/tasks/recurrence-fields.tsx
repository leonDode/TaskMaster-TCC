import type { Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { RecurrenceFrequency } from '@/features/tasks/types';
import type { TaskFormValues } from '@/features/tasks/task-form-dialog';
import { useTranslation } from '@/lib/i18n/use-translation';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface RecurrenceFieldsProps {
  control: Control<TaskFormValues>;
  frequency: RecurrenceFrequency;
}

export function RecurrenceFields({
  control,
  frequency,
}: RecurrenceFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {frequency === 'WEEKLY' && (
        <FormField
          control={control}
          name="recurrenceDaysOfWeek"
          render={({ field }) => {
            const selected = new Set<number>(field.value ?? []);
            return (
              <FormItem>
                <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                  {t('tasks.daysOfWeekLabel')}
                </FormLabel>
                <FormControl>
                  <div className="flex gap-1">
                    {WEEKDAY_KEYS.map((key, day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = new Set(selected);
                          if (next.has(day)) next.delete(day);
                          else next.add(day);
                          field.onChange(Array.from(next).sort());
                        }}
                        className={cn(
                          'text-body-sm size-9 rounded-full border transition-colors',
                          selected.has(day)
                            ? 'bg-primary border-primary text-white'
                            : 'border-outline-variant/30 text-on-surface-variant hover:border-primary',
                        )}
                      >
                        {t(`tasks.weekdayShort.${key}`)}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      )}

      {frequency === 'MONTHLY' && (
        <FormField
          control={control}
          name="recurrenceDayOfMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                {t('tasks.dayOfMonthLabel')}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="bg-input rounded-lg"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {frequency === 'YEARLY' && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="recurrenceMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                  {t('tasks.monthLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    className="bg-input rounded-lg"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="recurrenceDayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                  {t('tasks.dayLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    className="bg-input rounded-lg"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="recurrenceStartDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                {t('tasks.startsOnLabel')}
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
        <FormField
          control={control}
          name="recurrenceEndDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                {t('tasks.endsOnLabel')}
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
      </div>
    </div>
  );
}
