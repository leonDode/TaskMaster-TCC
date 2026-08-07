import type {
  NamespaceDictionary,
  TranslateParams,
  TranslationValue,
} from './types';

function resolve(
  dictionary: NamespaceDictionary,
  key: string,
): TranslationValue | undefined {
  const parts = key.split('.');
  let node: NamespaceDictionary | TranslationValue = dictionary;

  for (const part of parts) {
    if (typeof node !== 'object' || node === null || !(part in node)) {
      return undefined;
    }
    node = (node as NamespaceDictionary)[part];
  }

  return node as TranslationValue;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

// `count` decide a forma plural quando o valor traduzido é `{ one, other }`.
// en/pt-BR só têm as duas categorias — sem regras plurais especiais (ex.
// eslavas) a considerar.
export function translate(
  dictionary: NamespaceDictionary,
  key: string,
  params?: TranslateParams,
): string {
  const value = resolve(dictionary, key);

  if (value === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }

  const template =
    typeof value === 'string'
      ? value
      : params?.count === 1
        ? value.one
        : value.other;

  return interpolate(template, params);
}
