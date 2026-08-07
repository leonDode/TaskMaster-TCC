import { useCallback } from 'react';
import { useLocaleStore } from '@/stores/locale-store';
import en from './dictionaries/en';
import ptBR from './dictionaries/pt-BR';
import { translate } from './translate';
import type { TranslateParams } from './types';

const dictionaries = { en, 'pt-BR': ptBR };

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);

  const t = useCallback(
    (key: string, params?: TranslateParams) =>
      translate(dictionaries[locale], key, params),
    [locale],
  );

  return { t, locale };
}
