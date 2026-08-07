import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/use-translation';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div className="text-on-surface-variant flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="text-neon-cyan size-6 animate-spin" />
      <p className="text-body-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}
