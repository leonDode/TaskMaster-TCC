interface DailyProgressRingProps {
  done: number;
  total: number;
  size?: number;
}

const STROKE = 8;

/**
 * A meter — one ratio against a limit — for the share of today's tasks that
 * are done. Bare (no card chrome) because it lives inside the "tasks today"
 * stat tile: that tile supplies the label and the raw count, this supplies
 * the ratio.
 *
 * Deliberately not `ProgressRingButton`: that one is a 24/32px toggle
 * indicator that collapses into a checkmark when complete and has no slot for
 * a centre label. Same arc math, different job.
 */
export function DailyProgressRing({
  done,
  total,
  size = 96,
}: DailyProgressRingProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const radius = size / 2 - STROKE;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const center = size / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${percent}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE}
          className="stroke-surface-container-high"
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE}
          className="stroke-neon-cyan transition-[stroke-dashoffset] duration-500"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <span className="text-title-md text-on-surface absolute inset-0 flex items-center justify-center">
        {percent}%
      </span>
    </div>
  );
}
