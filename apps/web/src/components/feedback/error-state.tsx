import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  resolveApiErrorMessage,
  type ApiErrorContext,
} from '@/lib/resolve-api-error-message';

interface ErrorStateProps {
  error: unknown;
  context?: ApiErrorContext;
  onRetry?: () => void;
}

export function ErrorState({ error, context, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className="border-destructive/30 bg-destructive/10 flex flex-col items-center justify-center gap-3 rounded-xl border py-16 text-center">
      <AlertTriangle className="text-destructive size-8" />
      <p className="text-body-sm text-on-surface max-w-md px-4">
        {resolveApiErrorMessage(error, context)}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  );
}
