import type { Locale } from './i18n/config';
import type { ClothingType, LocalisedText, LookItem } from './types';

/** Picks the copy for the active language, falling back to the other one when empty. */
export function text(value: LocalisedText | string | undefined, locale: Locale, fallback = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;
  const preferred = locale === 'ar' ? value.ar : value.en;
  const other = locale === 'ar' ? value.en : value.ar;
  return preferred || other || fallback;
}

/** Clothing type names are admin-managed content, so they carry their own Arabic label. */
export function typeName(
  type: Pick<ClothingType, 'name' | 'nameAr'> | null | undefined,
  locale: Locale,
  fallback = '',
): string {
  if (!type) return fallback;
  return (locale === 'ar' ? type.nameAr || type.name : type.name) || fallback;
}

/** The same, for the snapshot a look keeps of the garment it was built from. */
export function lookTypeName(item: Pick<LookItem, 'typeName' | 'typeNameAr'>, locale: Locale): string {
  return locale === 'ar' ? item.typeNameAr || item.typeName : item.typeName;
}
