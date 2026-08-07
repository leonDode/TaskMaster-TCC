export type Plural = { one: string; other: string };
export type TranslationValue = string | Plural;

export interface NamespaceDictionary {
  [key: string]: TranslationValue | NamespaceDictionary;
}

export type Locale = 'en' | 'pt-BR';

export type TranslateParams = Record<string, string | number | undefined>;
