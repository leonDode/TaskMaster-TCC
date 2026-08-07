import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-section-margin flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-display-lg text-on-surface section-title-glow mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-body-lg text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </header>
  );
}
