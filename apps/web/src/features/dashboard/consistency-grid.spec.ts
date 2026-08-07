import { describe, expect, it } from 'vitest';
import {
  buildCategoryGrids,
  buildConsistencyGrid,
  DAYS_PER_WEEK,
  levelFor,
  WEEKS,
} from '@/features/dashboard/consistency-grid';
import type { TaskOccurrence } from '@/features/tasks/types';

function occurrence(
  occurrenceDate: string,
  completed: boolean,
  categoryId: string | null = null,
): TaskOccurrence {
  return {
    taskId: `${occurrenceDate}:${completed}:${categoryId}`,
    title: 'Task',
    description: null,
    categoryId,
    occurrenceDate,
    completed,
    kind: 'BOOLEAN',
    targetValue: null,
    unit: null,
    currentValue: null,
  };
}

describe('levelFor', () => {
  it('is empty when the day had tasks but none were completed', () => {
    expect(levelFor(0, 5)).toBe(0);
  });

  it('is empty when the day had no tasks at all', () => {
    expect(levelFor(0, 0)).toBe(0);
  });

  it('reaches the top step only on a fully completed day', () => {
    expect(levelFor(3, 3)).toBe(4);
    expect(levelFor(2, 3)).toBeLessThan(4);
  });

  it('ranks by ratio, not by raw count', () => {
    // 3 of 3 is a better day than 3 of 10, even though the count is equal.
    expect(levelFor(3, 3)).toBeGreaterThan(levelFor(3, 10));
  });
});

describe('buildConsistencyGrid', () => {
  it('always returns a fixed-size grid so the layout never reflows', () => {
    expect(buildConsistencyGrid([], '2026-05-04')).toHaveLength(
      WEEKS * DAYS_PER_WEEK,
    );
  });

  it('starts at the given date and advances one day per cell', () => {
    const grid = buildConsistencyGrid([], '2026-05-04');
    expect(grid[0].date).toBe('2026-05-04');
    expect(grid[1].date).toBe('2026-05-05');
    expect(grid.at(-1)?.date).toBe('2026-07-26');
  });

  it('aggregates several occurrences that share a date', () => {
    const grid = buildConsistencyGrid(
      [
        occurrence('2026-05-05', true),
        occurrence('2026-05-05', false),
        occurrence('2026-05-05', true),
      ],
      '2026-05-04',
    );
    expect(grid[1]).toMatchObject({ done: 2, total: 3, level: 2 });
  });

  it('leaves days outside the fetched range empty', () => {
    const grid = buildConsistencyGrid(
      [occurrence('2020-01-01', true)],
      '2026-05-04',
    );
    expect(grid.every((cell) => cell.total === 0)).toBe(true);
  });
});

describe('buildCategoryGrids', () => {
  it('keeps each category in its own grid', () => {
    const grids = buildCategoryGrids(
      [
        occurrence('2026-05-04', true, 'work'),
        occurrence('2026-05-04', true, 'study'),
      ],
      '2026-05-04',
    );
    expect(grids.map((g) => g.categoryId).sort()).toEqual(['study', 'work']);
    // A category's grid must not count another category's completions.
    expect(grids.every((g) => g.cells[0].total === 1)).toBe(true);
  });

  it('orders the most-completed category first', () => {
    const grids = buildCategoryGrids(
      [
        occurrence('2026-05-04', true, 'quiet'),
        occurrence('2026-05-04', true, 'busy'),
        occurrence('2026-05-05', true, 'busy'),
      ],
      '2026-05-04',
    );
    expect(grids[0].categoryId).toBe('busy');
  });

  it('drops categories with no completions instead of drawing empty strips', () => {
    const grids = buildCategoryGrids(
      [
        occurrence('2026-05-04', false, 'untouched'),
        occurrence('2026-05-04', true, 'active'),
      ],
      '2026-05-04',
    );
    expect(grids.map((g) => g.categoryId)).toEqual(['active']);
  });

  it('groups tasks with no category under a null key', () => {
    const grids = buildCategoryGrids(
      [occurrence('2026-05-04', true)],
      '2026-05-04',
    );
    expect(grids[0].categoryId).toBeNull();
  });
});
