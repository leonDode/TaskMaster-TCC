import { expandOccurrences, type RecurrenceRule } from '@task-master/shared';
import { useMemo } from 'react';
import type { RecurrenceFrequency } from '@/features/tasks/types';
import { useTranslation } from '@/lib/i18n/use-translation';

interface RecurrencePreviewProps {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

const MAX_WINDOW_MONTHS = 60;
const PREVIEW_COUNT = 5;

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().slice(0, 10);
}

function buildRule(props: RecurrencePreviewProps): RecurrenceRule | null {
  const startDate = props.startDate;
  if (!startDate) return null;
  const endDate = props.endDate ?? null;

  switch (props.frequency) {
    case 'DAILY':
      return { frequency: 'DAILY', startDate, endDate };
    case 'WEEKLY':
      if (!props.daysOfWeek?.length) return null;
      return {
        frequency: 'WEEKLY',
        startDate,
        endDate,
        daysOfWeek: props.daysOfWeek,
      };
    case 'MONTHLY':
      if (!props.dayOfMonth) return null;
      return {
        frequency: 'MONTHLY',
        startDate,
        endDate,
        dayOfMonth: props.dayOfMonth,
      };
    case 'YEARLY':
      if (!props.dayOfMonth || !props.month) return null;
      return {
        frequency: 'YEARLY',
        startDate,
        endDate,
        month: props.month,
        dayOfMonth: props.dayOfMonth,
      };
  }
}

function findOccurrences(rule: RecurrenceRule): string[] {
  let windowMonths = 3;
  while (windowMonths <= MAX_WINDOW_MONTHS) {
    const windowEnd = rule.endDate
      ? rule.endDate < addMonths(rule.startDate, windowMonths)
        ? rule.endDate
        : addMonths(rule.startDate, windowMonths)
      : addMonths(rule.startDate, windowMonths);

    const occurrences = expandOccurrences(rule, rule.startDate, windowEnd);
    if (occurrences.length > 0 || windowEnd === rule.endDate) {
      return occurrences.slice(0, PREVIEW_COUNT);
    }
    windowMonths *= 2;
  }
  return [];
}

export function RecurrencePreview(props: RecurrencePreviewProps) {
  const { t } = useTranslation();
  const occurrences = useMemo(() => {
    const rule = buildRule(props);
    if (!rule) return null;
    return findOccurrences(rule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.frequency,
    props.startDate,
    props.endDate,
    props.dayOfMonth,
    props.month,
    props.daysOfWeek,
  ]);

  if (occurrences === null) {
    return null;
  }

  return (
    <div className="border-outline-variant/20 bg-surface-container-low rounded-lg border p-3">
      <p className="text-label-caps text-on-surface-variant mb-2 uppercase">
        {t('tasks.nextOccurrencesLabel')}
      </p>
      {occurrences.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          {t('tasks.noOccurrencesFound', { count: MAX_WINDOW_MONTHS })}
        </p>
      ) : (
        <ul className="text-body-sm text-on-surface flex flex-wrap gap-2">
          {occurrences.map((date) => (
            <li
              key={date}
              className="bg-surface-container-high rounded-full px-3 py-1"
            >
              {date}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
