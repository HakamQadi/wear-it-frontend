export const LOCALES = ['ar', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Arabic is the default; English is available through the language switch. */
export const DEFAULT_LOCALE: Locale = 'ar';

export const LOCALE_DIRECTION: Record<Locale, 'rtl' | 'ltr'> = { ar: 'rtl', en: 'ltr' };

export const LOCALE_LABEL: Record<Locale, string> = { ar: 'العربية', en: 'English' };

/**
 * Used for dates and numbers so a locale switch changes them too.
 *
 * Arabic pins the Latin numbering system: the default for `ar` varies with the browser's
 * ICU build, so leaving it unset means some visitors see ١٢٣ and others 123 — and prices,
 * counts and dates would disagree with each other on the same page. Latin digits are the
 * common choice across Arabic web interfaces.
 */
export const LOCALE_TAG: Record<Locale, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

export const LOCALE_STORAGE_KEY = 'wear_it_locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
