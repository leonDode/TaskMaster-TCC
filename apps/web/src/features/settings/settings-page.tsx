import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useResetAllTasksMutation } from '@/features/settings/use-reset-all-tasks-mutation';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/types';
import { useLocaleStore } from '@/stores/locale-store';
import type { Theme } from '@/stores/theme-store';
import { useThemeStore } from '@/stores/theme-store';

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const resetAllTasks = useResetAllTasksMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirmReset() {
    resetAllTasks.mutate(undefined, {
      onSettled: () => setConfirmOpen(false),
    });
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} />

      <div className="flex flex-col gap-card-gap">
        <section className="bg-card rounded-lg border border-outline-variant p-gutter">
          <h2 className="text-title-md text-on-surface">
            {t('settings.appearanceTitle')}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1 mb-6">
            {t('settings.appearanceDescription')}
          </p>

          <p className="text-label-caps text-on-surface-variant mb-2 uppercase">
            {t('settings.themeLabel')}
          </p>
          <div className="bg-surface-container-high inline-flex rounded-full p-1">
            {(['dark', 'light'] as Theme[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={cn(
                  'text-body-sm rounded-full px-6 py-2 transition-all',
                  theme === option
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {option === 'dark'
                  ? t('settings.themeDark')
                  : t('settings.themeLight')}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-lg border border-outline-variant p-gutter">
          <h2 className="text-title-md text-on-surface">
            {t('settings.languageTitle')}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1 mb-6">
            {t('settings.languageDescription')}
          </p>

          <p className="text-label-caps text-on-surface-variant mb-2 uppercase">
            {t('settings.languageLabel')}
          </p>
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as Locale)}
          >
            <SelectTrigger className="bg-input w-full max-w-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">
                {t('settings.languageEnglish')}
              </SelectItem>
              <SelectItem value="pt-BR">
                {t('settings.languagePtBr')}
              </SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="border-destructive/30 bg-destructive/5 rounded-lg border p-gutter">
          <h2 className="text-title-md text-destructive">
            {t('settings.dangerZoneTitle')}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1 mb-6">
            {t('settings.dangerZoneDescription')}
          </p>

          <div className="border-destructive/20 bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-title-md text-on-surface">
                {t('settings.resetTasksTitle')}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-md">
                {t('settings.resetTasksDescription')}
              </p>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  {t('settings.resetTasksButton')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('settings.confirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings.confirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={resetAllTasks.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      handleConfirmReset();
                    }}
                  >
                    {t('settings.confirmButton')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </div>
  );
}
