import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/use-translation';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-display-lg text-on-surface">{t('notFound.code')}</p>
      <p className="text-body-lg text-on-surface-variant">
        {t('notFound.message')}
      </p>
      <Button asChild>
        <Link to="/">{t('notFound.backLink')}</Link>
      </Button>
    </div>
  );
}
