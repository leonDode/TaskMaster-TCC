import { useMemo } from 'react';
import {
  categoryTint,
  FALLBACK_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import { useCategoriesQuery } from '@/features/categories/use-categories-query';
import {
  buildCategoryGrids,
  DAYS_PER_WEEK,
  type DayCell,
  WEEKS,
} from '@/features/dashboard/consistency-grid';
import { useOccurrencesQuery } from '@/features/occurrences/use-occurrences-query';
import { addDays, todayIsoDate, weekdayMondayFirst } from '@/lib/date';
import { useTranslation } from '@/lib/i18n/use-translation';

/**
 * Opacity steps of the category's own color. A single-hue ramp per strip:
 * the hue says *which* category, the step says *how much* of that day got
 * done — so the two channels never fight each other.
 */
const LEVEL_PERCENT = [0, 30, 55, 78, 100] as const;

function CategoryStrip({
  name,
  color,
  cells,
  formatCellLabel,
}: {
  name: string;
  color: string | null;
  cells: DayCell[];
  formatCellLabel: (cell: DayCell) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color ?? FALLBACK_CATEGORY_COLOR }}
        />
        <span className="text-body-sm text-on-surface-variant truncate">
          {name}
        </span>
      </div>
      <div
        role="group"
        aria-label={name}
        className="grid grid-flow-col grid-rows-7 justify-start gap-[3px]"
      >
        {cells.map((cell) => {
          const label = formatCellLabel(cell);
          return (
            <span
              key={cell.date}
              role="img"
              title={label}
              aria-label={label}
              className={
                cell.level === 0
                  ? 'bg-surface-container-high size-[11px] rounded-[2px]'
                  : 'size-[11px] rounded-[2px]'
              }
              style={
                cell.level === 0
                  ? undefined
                  : {
                      backgroundColor: categoryTint(
                        color,
                        LEVEL_PERCENT[cell.level],
                      ),
                    }
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConsistencyHeatmap() {
  const { t, locale } = useTranslation();
  const { data: categories } = useCategoriesQuery();

  const today = todayIsoDate();
  // Anchor on the Monday of the current week so the last column is this week.
  const gridStart = addDays(
    addDays(today, -weekdayMondayFirst(today)),
    -DAYS_PER_WEEK * (WEEKS - 1),
  );
  const gridEnd = addDays(gridStart, WEEKS * DAYS_PER_WEEK - 1);

  const { data } = useOccurrencesQuery({ from: gridStart, to: gridEnd });

  const grids = useMemo(
    () => buildCategoryGrids(data ?? [], gridStart),
    [data, gridStart],
  );

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const formatDate = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(
      locale === 'pt-BR' ? 'pt-BR' : undefined,
      { day: 'numeric', month: 'long', timeZone: 'UTC' },
    );
  };

  const formatCellLabel = (cell: DayCell) =>
    cell.total > 0
      ? t('dashboard.consistencyCell', {
          date: formatDate(cell.date),
          done: cell.done,
          total: cell.total,
        })
      : t('dashboard.consistencyCellEmpty', { date: formatDate(cell.date) });

  return (
    <section className="bg-card border-outline-variant/40 rounded-xl border p-6">
      <p className="text-label-caps text-on-surface-variant uppercase">
        {t('dashboard.consistencyTitle')}
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1 mb-4">
        {t('dashboard.consistencySubtitle')}
      </p>

      {grids.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          {t('dashboard.consistencyEmpty')}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grids.map((grid) => {
            const category = grid.categoryId
              ? categoryById.get(grid.categoryId)
              : undefined;
            return (
              <CategoryStrip
                key={grid.categoryId ?? 'uncategorized'}
                name={category?.name ?? t('dashboard.consistencyUncategorized')}
                color={category?.color ?? null}
                cells={grid.cells}
                formatCellLabel={formatCellLabel}
              />
            );
          })}
        </div>
      )}

      {/* Neutral swatches on purpose: the legend explains the *opacity*
          channel (how much of the day got done), which is shared by every
          strip. The hue is explained by each strip's own name + dot. */}
      {grids.length > 0 && (
        <div className="text-body-sm text-on-surface-variant mt-5 flex items-center justify-end gap-1.5">
          <span>{t('dashboard.consistencyLess')}</span>
          {LEVEL_PERCENT.map((percent) => (
            <span
              key={percent}
              aria-hidden="true"
              className={
                percent === 0
                  ? 'bg-surface-container-high size-[11px] rounded-[2px]'
                  : 'size-[11px] rounded-[2px]'
              }
              style={
                percent === 0
                  ? undefined
                  : {
                      backgroundColor: `color-mix(in srgb, var(--on-surface-variant) ${percent}%, transparent)`,
                    }
              }
            />
          ))}
          <span>{t('dashboard.consistencyMore')}</span>
        </div>
      )}
    </section>
  );
}
