// Reine Konstanten/Typen ohne Server-only-Imports (next/headers), damit diese
// Datei sowohl von Server-Code (i18n/request.ts) als auch von Client
// Components (z.B. UserMenu.tsx fuer den Sprachumschalter) importiert werden
// kann, ohne next/headers ins Client-Bundle zu ziehen.
export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'it'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'de';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export function isSupportedLocale(value: string | undefined): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
