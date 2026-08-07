import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="border-outline-variant/20 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Icon className="text-on-surface-variant size-8" />
      <div>
        <p className="text-title-md text-on-surface">{title}</p>
        {description && (
          <p className="text-body-sm text-on-surface-variant mt-1">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
