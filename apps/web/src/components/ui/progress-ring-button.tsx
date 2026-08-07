import { cn } from '@/lib/utils';

interface ProgressRingButtonProps {
  percent: number;
  completed?: boolean;
  size?: 24 | 32;
  className?: string;
}

export function ProgressRingButton({
  percent,
  completed = false,
  size = 24,
  className,
}: ProgressRingButtonProps) {
  const strokeWidth = 2;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const center = size / 2;

  if (completed) {
    return (
      <div
        className={cn(
          'bg-neon-cyan border-neon-cyan flex shrink-0 items-center justify-center rounded-full border-2',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-surface text-xs font-bold">✓</span>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        className="stroke-outline"
        fill="none"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        className="stroke-neon-cyan transition-[stroke-dashoffset]"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
