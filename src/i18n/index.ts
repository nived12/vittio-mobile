import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import es from './es.json';

const supportedLocales = ['en', 'es'] as const;
type SupportedLocale = (typeof supportedLocales)[number];

/**
 * Derive the best locale from the device's locale list.
 * Falls back to 'en' if nothing matches.
 */
function detectLocale(): SupportedLocale {
  const deviceLocales = Localization.getLocales();
  for (const locale of deviceLocales) {
    const lang = locale.languageCode as string;
    if ((supportedLocales as readonly string[]).includes(lang)) {
      return lang as SupportedLocale;
    }
  }
  return 'es';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng:              detectLocale(),
    fallbackLng:      'es',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    compatibilityJSON: 'v3',
  });

export default i18n;

/**
 * Convenience helper — maps a SCREAMING_SNAKE_CASE API error code to a
 * localized string. Returns the fallback if the code is unknown.
 */
export function getErrorMessage(code: string, fallback?: string): string {
  const key = `errors.${code}`;
  const translated = i18n.t(key);
  // i18next returns the key itself when no translation is found
  if (translated === key) {
    return fallback ?? i18n.t('errors.UNKNOWN_ERROR');
  }
  return translated;
}
