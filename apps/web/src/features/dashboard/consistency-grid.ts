import type { TaskOccurrence } from '@/features/tasks/types';
import { addDays } from '@/lib/date';

export const WEEKS = 12;
export const DAYS_PER_WEEK = 7;

export interface DayCell {
  date: string;
  done: number;
  total: number;
  /** 0 = nothing completed; 1..4 index the sequential ramp in index.css. */
  level: number;
}

/**
 * Share of the day's tasks that got completed, bucketed into the 4 ramp
 * steps. Ratio rather than raw count: finishing 3 of 3 is a better day than
 * finishing 3 of 10, and a count-based ramp would say the opposite.
 */
export function levelFor(done: number, total: number): number {
  if (done === 0 || total === 0) return 0;
  const ratio = done / total;
  if (ratio < 0.5) return 1;
  if (ratio < 0.8) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export interface CategoryGrid {
  /** `null` groups every task that has no category assigned. */
  categoryId: string | null;
  cells: DayCell[];
  totalDone: number;
}

/**
 * One grid per category (small multiples), so each strip can be tinted with
 * that category's own user-picked color: hue carries identity, the ramp
 * inside a strip carries magnitude.
 *
 * Ordered by completions so the categories the user actually works on lead,
 * and categories with no activity in the window are dropped entirely rather
 * than rendered as empty strips.
 */
export function buildCategoryGrids(
  occurrences: TaskOccurrence[],
  gridStart: string,
): CategoryGrid[] {
  const byCategory = new Map<string | null, TaskOccurrence[]>();
  for (const occurrence of occurrences) {
    const key = occurrence.categoryId;
    const list = byCategory.get(key) ?? [];
    list.push(occurrence);
    byCategory.set(key, list);
  }

  return Array.from(byCategory, ([categoryId, list]) => ({
    categoryId,
    cells: buildConsistencyGrid(list, gridStart),
    totalDone: list.filter((occurrence) => occurrence.completed).length,
  }))
    .filter((grid) => grid.totalDone > 0)
    .sort((a, b) => b.totalDone - a.totalDone);
}

/** Fixed-size grid so the layout never reflows as data loads or changes. */
export function buildConsistencyGrid(
  occurrences: TaskOccurrence[],
  gridStart: string,
): DayCell[] {
  const byDate = new Map<string, { done: number; total: number }>();
  for (const occurrence of occurrences) {
    const bucket = byDate.get(occurrence.occurrenceDate) ?? {
      done: 0,
      total: 0,
    };
    bucket.total += 1;
    if (occurrence.completed) bucket.done += 1;
    byDate.set(occurrence.occurrenceDate, bucket);
  }

  return Array.from({ length: WEEKS * DAYS_PER_WEEK }, (_, index) => {
    const date = addDays(gridStart, index);
    const { done, total } = byDate.get(date) ?? { done: 0, total: 0 };
    return { date, done, total, level: levelFor(done, total) };
  });
}
