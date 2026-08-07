export interface CategoryColorOption {
  id: string;
  hex: string;
  labelKey: string;
}

// Hex values must mirror the --neon-*/--chart-*/--destructive tokens in
// index.css (dark theme values, since categories are colored the same way
// regardless of the active theme).
export const CATEGORY_COLOR_PRESET: readonly CategoryColorOption[] = [
  { id: 'pink', hex: '#ff2d78', labelKey: 'categories.colorOptions.pink' },
  { id: 'cyan', hex: '#00f0ff', labelKey: 'categories.colorOptions.cyan' },
  { id: 'violet', hex: '#7000ff', labelKey: 'categories.colorOptions.violet' },
  { id: 'rose', hex: '#ffb1c0', labelKey: 'categories.colorOptions.rose' },
  { id: 'purple', hex: '#a178ff', labelKey: 'categories.colorOptions.purple' },
  { id: 'red', hex: '#93000a', labelKey: 'categories.colorOptions.red' },
  { id: 'amber', hex: '#f5a623', labelKey: 'categories.colorOptions.amber' },
  {
    id: 'emerald',
    hex: '#00c896',
    labelKey: 'categories.colorOptions.emerald',
  },
  { id: 'blue', hex: '#3b82f6', labelKey: 'categories.colorOptions.blue' },
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_PRESET[1].hex;

/**
 * Color for a category that has none stored. A CSS var rather than a literal
 * so it tracks the theme — the old hardcoded `#00f0ff` is the *dark* cyan and
 * failed contrast as chip text on a white card.
 */
export const FALLBACK_CATEGORY_COLOR = 'var(--neon-cyan)';

/**
 * Translucent wash of a category color, for chip/pill backgrounds. Uses
 * `color-mix` instead of the old `${hex}33` suffix so it also accepts the
 * `var()` fallback above.
 */
export function categoryTint(
  color: string | null | undefined,
  percent: number,
) {
  return `color-mix(in srgb, ${color ?? FALLBACK_CATEGORY_COLOR} ${percent}%, transparent)`;
}
