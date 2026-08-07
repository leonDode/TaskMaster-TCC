/**
 * Small set of UTC-safe date helpers operating on 'YYYY-MM-DD' calendar
 * strings, matching the convention used by `@task-master/shared`'s
 * `expandOccurrences` and the API's date-only fields.
 */

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toIsoDate(new Date(Date.UTC(y, m - 1, d + days)));
}

export function startOfMonth(year: number, month: number): string {
  return toIsoDate(new Date(Date.UTC(year, month, 1)));
}

export function endOfMonth(year: number, month: number): string {
  return toIsoDate(new Date(Date.UTC(year, month + 1, 0)));
}

export function weekdayMondayFirst(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const sunday0 = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (sunday0 + 6) % 7;
}

/**
 * Full weeks (Monday-start) covering the given month, so the grid never has
 * a ragged first/last row.
 */
export function getMonthGridDates(year: number, month: number): string[] {
  const monthStart = startOfMonth(year, month);
  const monthEnd = endOfMonth(year, month);
  const gridStart = addDays(monthStart, -weekdayMondayFirst(monthStart));
  const gridEnd = addDays(monthEnd, 6 - weekdayMondayFirst(monthEnd));

  const dates: string[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}
