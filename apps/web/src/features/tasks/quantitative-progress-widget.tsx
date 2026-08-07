import { Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { UnitType } from '@task-master/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressRingButton } from '@/components/ui/progress-ring-button';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

export function getProgressPercent(
  currentValue: number | null,
  targetValue: number | null,
) {
  const current = currentValue ?? 0;
  const target = targetValue ?? 0;
  return target > 0 ? Math.min(100, (current / target) * 100) : 0;
}

interface QuantitativeProgressWidgetProps {
  currentValue: number | null;
  targetValue: number | null;
  unit: UnitType | null;
  completed: boolean;
  onIncrement: (delta: number) => void;
  onCorrectValue?: (value: number) => void;
  incrementPending?: boolean;
  correctPending?: boolean;
  /** Chips (category, due date, ...) rendered at the end of the row. */
  trailing?: ReactNode;
}

export function QuantitativeProgressWidget({
  currentValue,
  targetValue,
  unit,
  completed,
  onIncrement,
  onCorrectValue,
  incrementPending,
  correctPending,
  trailing,
}: QuantitativeProgressWidgetProps) {
  const { t } = useTranslation();
  const [incrementInput, setIncrementInput] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [correctInput, setCorrectInput] = useState('');

  const current = currentValue ?? 0;
  const target = targetValue ?? 0;
  const percent = getProgressPercent(currentValue, targetValue);
  const unitLabel = unit ? t(`units.${unit}`) : '';

  function handleAdd() {
    const delta = Number(incrementInput);
    if (!incrementInput || Number.isNaN(delta) || delta <= 0) return;
    onIncrement(delta);
    setIncrementInput('');
  }

  function handleCorrect() {
    const value = Number(correctInput);
    if (correctInput === '' || Number.isNaN(value) || value < 0) return;
    onCorrectValue?.(value);
    setCorrecting(false);
    setCorrectInput('');
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <ProgressRingButton percent={percent} completed={completed} />

      <span
        className={cn(
          'text-body-sm text-on-surface-variant shrink-0 whitespace-nowrap',
          completed && 'text-neon-cyan',
        )}
      >
        {current}
        {target > 0 ? ` / ${target}` : ''} {unitLabel}
      </span>

      {onCorrectValue && (
        <button
          type="button"
          onClick={() => setCorrecting((v) => !v)}
          title={t('tasks.correctValueButton')}
          className="text-on-surface-variant hover:text-on-surface shrink-0"
        >
          <Pencil className="size-3.5" />
        </button>
      )}

      {correcting ? (
        <div className="flex min-w-[160px] flex-1 items-center gap-2">
          <Input
            type="number"
            min={0}
            step={0.01}
            autoFocus
            disabled={correctPending}
            value={correctInput}
            onChange={(e) => setCorrectInput(e.target.value)}
            className="bg-input h-8 rounded-lg"
            placeholder={t('tasks.correctValuePlaceholder')}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={correctPending}
            onClick={handleCorrect}
          >
            {correctPending
              ? t('tasks.savingLabel')
              : t('tasks.correctValueButton')}
          </Button>
        </div>
      ) : (
        <div className="flex min-w-[160px] flex-1 items-center gap-2">
          <Input
            type="number"
            min={0.01}
            step={0.01}
            disabled={incrementPending}
            value={incrementInput}
            onChange={(e) => setIncrementInput(e.target.value)}
            className="bg-input h-8 rounded-lg"
            placeholder={t('tasks.incrementPlaceholder')}
          />
          <Button
            type="button"
            size="sm"
            disabled={incrementPending}
            onClick={handleAdd}
          >
            {t('tasks.addButton')}
          </Button>
        </div>
      )}

      {trailing && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {trailing}
        </div>
      )}
    </div>
  );
}
