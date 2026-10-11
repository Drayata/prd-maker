import { en } from './en';
import { id } from './id';

const dictionaries = { id, en };
export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof id;

let locale: Locale = 'id';

export function setLocale(nextLocale: Locale) {
  locale = nextLocale;
  document.documentElement.lang = nextLocale;
}

export function t(key: TranslationKey): string {
  return dictionaries[locale][key];
}
