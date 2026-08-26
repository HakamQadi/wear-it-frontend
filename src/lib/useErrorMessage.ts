'use client';

import { useCallback } from 'react';
import { useI18n, type TranslationKey } from '@/context/I18nContext';
import { ApiError } from './api';

/**
 * Turns a caught error into a message in the active language.
 *
 * Business errors carry a stable `code`, which is translated with the values the sentence
 * needs. Anything without a known code falls back to the server's English text, and a
 * non-API failure to the caller's own message.
 */
export function useErrorMessage() {
  const { t } = useI18n();

  return useCallback(
    (error: unknown, fallback: TranslationKey): string => {
      if (error instanceof ApiError) {
        if (error.code) {
          const key = `errors.${error.code}` as TranslationKey;
          const translated = t(key, error.params);
          // t() returns the key itself when there is no entry for it.
          if (translated !== key) return translated;
        }
        if (error.status === 0) return t('states.unreachable');
        if (error.message) return error.message;
      }
      return t(fallback);
    },
    [t],
  );
}
