'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { LOCALES, LOCALE_LABEL } from '@/lib/i18n/config';

/** Switches the interface language and, with it, the page direction. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const other = LOCALES.find((candidate) => candidate !== locale) ?? locale;

  return (
    <button
      type="button"
      className={`languageSwitch ${compact ? 'compact' : ''}`}
      onClick={() => setLocale(other)}
      aria-label={`${t('common.language')}: ${LOCALE_LABEL[other]}`}
      title={LOCALE_LABEL[other]}
      lang={other}
    >
      <Languages size={16} />
      <span>{LOCALE_LABEL[other]}</span>
    </button>
  );
}
