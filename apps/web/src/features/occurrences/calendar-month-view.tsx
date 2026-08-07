import { FALLBACK_CATEGORY_COLOR } from '@/features/categories/category-colors';
import type { Category } from '@/features/categories/types';
import type { TaskOccurrence } from '@/features/tasks/types';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface CalendarMonthViewProps {
  gridDates: string[];
  currentMonth: number;
  occurrencesByDate: Map<string, TaskOccurrence[]>;
  categoryById: Map<string, Category>;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}

export function CalendarMonthView({
  gridDates,
  currentMonth,
  occurrencesByDate,
  categoryById,
  selectedDate,
  today,
  onSelectDate,
}: CalendarMonthViewProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-7 gap-card-gap">
      {WEEKDAY_KEYS.map((key) => (
        <div
          key={key}
          className="text-label-caps text-on-surface-variant py-2 text-center uppercase"
        >
          {t(`occurrences.weekdayShort.${key}`)}
        </div>
      ))}

      {gridDates.map((date) => {
        const [, month, day] = date.split('-').map(Number);
        const inCurrentMonth = month - 1 === currentMonth;
        const occurrences = occurrencesByDate.get(date) ?? [];
        const isSelected = date === selectedDate;
        const isToday = date === today;
        const categoryColors = Array.from(
          new Set(
            occurrences.map(
              (o) =>
                categoryById.get(o.categoryId ?? '')?.color ??
                FALLBACK_CATEGORY_COLOR,
            ),
          ),
        );

        return (
          <button
            key={date}
            onClick={() => onSelectDate(date)}
            className={cn(
              'border-outline-variant/10 flex h-28 flex-col justify-between rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
              isSelected
                ? 'bg-surface-container-high border-2 border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-surface-container',
              !inCurrentMonth && 'opacity-40',
            )}
          >
            <span
              className={cn(
                'text-body-sm font-bold',
                isToday && !isSelected && 'text-primary',
                isSelected && 'text-neon-cyan',
              )}
            >
              {String(day).padStart(2, '0')}
            </span>
            <div className="flex flex-wrap gap-1">
              {categoryColors.map((color) => (
                <span
                  key={color}
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
