'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ar } from '@/lib/i18n/ar';
import { en } from '@/lib/i18n/en';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_DIRECTION,
  LOCALE_STORAGE_KEY,
  LOCALE_TAG,
  type Locale,
} from '@/lib/i18n/config';

type Dictionary = typeof ar;
type Group = keyof Dictionary;

/** "closet.title" — group and key, checked against the Arabic dictionary. */
export type TranslationKey = {
  [G in Group]: `${G & string}.${keyof Dictionary[G] & string}`;
}[Group];

const DICTIONARIES: Record<Locale, Dictionary> = { ar, en: en as unknown as Dictionary };

type I18nContextValue = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  /** BCP 47 tag for Intl formatting. */
  tag: string;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const [group, entry] = key.split('.');
  const bucket = (dictionary as Record<string, Record<string, string>>)[group];
  return bucket?.[entry];
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // Private browsing can refuse storage; the default locale still applies.
    }
    if (isLocale(stored) && stored !== locale) setLocaleState(stored);
    // Only on mount: afterwards setLocale owns the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The document starts as Arabic/RTL from the server; keep it in step with the choice.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_DIRECTION[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Not persisting is preferable to failing the switch.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = DICTIONARIES[locale];
    return {
      locale,
      dir: LOCALE_DIRECTION[locale],
      tag: LOCALE_TAG[locale],
      setLocale,
      t: (key, values) => {
        // Falls back to Arabic, then to the key itself, so a missing entry is visible
        // rather than rendering as an empty string.
        const template = lookup(dictionary, key) ?? lookup(ar, key) ?? key;
        return interpolate(template, values);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
