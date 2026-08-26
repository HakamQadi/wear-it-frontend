'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n, type TranslationKey } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import { CONTENT_FIELDS, type ContentField, type LocalisedText, type SiteContent } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

type ContentForm = Record<ContentField, LocalisedText>;

const EMPTY_TEXT: LocalisedText = { ar: '', en: '' };
const EMPTY: ContentForm = {
  brandName: EMPTY_TEXT,
  announcement: EMPTY_TEXT,
  heroTitle: EMPTY_TEXT,
  heroSubtitle: EMPTY_TEXT,
  heroCta: EMPTY_TEXT,
  footerText: EMPTY_TEXT,
};

const FIELD_LABELS: Record<ContentField, TranslationKey> = {
  brandName: 'admin.fieldBrandName',
  announcement: 'admin.fieldAnnouncement',
  heroTitle: 'admin.fieldHeroTitle',
  heroSubtitle: 'admin.fieldHeroSubtitle',
  heroCta: 'admin.fieldHeroCta',
  footerText: 'admin.fieldFooterText',
};

/** Long copy gets a textarea; the rest a single line. */
const MULTILINE: ReadonlySet<ContentField> = new Set<ContentField>(['heroSubtitle']);

/**
 * The API rejects unknown properties, so never echo back the document metadata
 * (_id, key, __v, timestamps) that GET /content returns alongside the editable copy.
 */
function editableFields(value: Partial<SiteContent>): ContentForm {
  const result = {} as ContentForm;
  for (const field of CONTENT_FIELDS) {
    const stored = value[field];
    result[field] = { ar: stored?.ar ?? '', en: stored?.en ?? '' };
  }
  return result;
}

export default function ContentAdmin() {
  const { t } = useI18n();
  const describeError = useErrorMessage();
  const [form, setForm] = useState<ContentForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setForm(editableFields(value)))
      .catch((caught: unknown) => setError(describeError(caught, 'admin.contentLoadFailed')))
      // The form only appears once the saved copy has arrived, so a slow response can
      // never overwrite text the admin has already started typing.
      .finally(() => setLoaded(true));
  }, [describeError]);

  function edit(field: ContentField, language: keyof LocalisedText, value: string) {
    setForm((current) => ({ ...current, [field]: { ...current[field], [language]: value } }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const saved = await api<SiteContent>(
        '/content',
        { method: 'PATCH', body: JSON.stringify(form) },
        adminSession.get(),
      );
      setForm(editableFields(saved));
      setNotice(t('admin.contentSaved'));
    } catch (caught: unknown) {
      setError(describeError(caught, 'admin.contentSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{t('admin.contentTitle')}</h1>
          <p>{t('admin.contentSubtitle')}</p>
        </div>
      </div>

      <section className="adminPanel" style={{ maxWidth: 900 }}>
        {!loaded ? (
          <LoadingState label={t('admin.contentLoading')} />
        ) : (
          <form className="contentForm" onSubmit={save}>
            {CONTENT_FIELDS.map((field) => (
              <fieldset className="contentField" key={field}>
                <legend>{t(FIELD_LABELS[field])}</legend>
                <label className="formField">
                  <span>{t('admin.inArabic')}</span>
                  {MULTILINE.has(field) ? (
                    <textarea
                      className="textarea"
                      dir="rtl"
                      maxLength={400}
                      value={form[field].ar}
                      onChange={(event) => edit(field, 'ar', event.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      dir="rtl"
                      maxLength={400}
                      value={form[field].ar}
                      onChange={(event) => edit(field, 'ar', event.target.value)}
                    />
                  )}
                </label>
                <label className="formField">
                  <span>{t('admin.inEnglish')}</span>
                  {MULTILINE.has(field) ? (
                    <textarea
                      className="textarea"
                      dir="ltr"
                      maxLength={400}
                      value={form[field].en}
                      onChange={(event) => edit(field, 'en', event.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      dir="ltr"
                      maxLength={400}
                      value={form[field].en}
                      onChange={(event) => edit(field, 'en', event.target.value)}
                    />
                  )}
                </label>
              </fieldset>
            ))}

            {notice && <p className="muted">{notice}</p>}
            <ErrorNote message={error} />
            <div className="formActions">
              <button className="button sm" disabled={saving}>
                <Save size={15} />
                {saving ? t('closet.saving') : t('admin.saveContent')}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
