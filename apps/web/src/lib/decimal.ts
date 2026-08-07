export function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}
