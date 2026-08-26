'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { ApiError, api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { SiteContent } from '@/lib/types';

const EMPTY: SiteContent = {
  brandName: '',
  heroTitle: '',
  heroSubtitle: '',
  heroCta: '',
  announcement: '',
  footerText: '',
};

/**
 * The API rejects unknown properties, so never echo back the document metadata
 * (_id, key, __v, timestamps) that GET /content returns alongside the editable copy.
 */
function editableFields(value: Partial<SiteContent>): SiteContent {
  return {
    brandName: value.brandName ?? EMPTY.brandName,
    heroTitle: value.heroTitle ?? EMPTY.heroTitle,
    heroSubtitle: value.heroSubtitle ?? EMPTY.heroSubtitle,
    heroCta: value.heroCta ?? EMPTY.heroCta,
    announcement: value.announcement ?? EMPTY.announcement,
    footerText: value.footerText ?? EMPTY.footerText,
  };
}

export default function ContentAdmin() {
  const [form, setForm] = useState<SiteContent>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setForm(editableFields(value)))
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Could not load site content.'))
      // The form only appears once the saved copy has arrived, so a slow response can
      // never overwrite text the admin has already started typing.
      .finally(() => setLoaded(true));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const saved = await api<SiteContent>(
        '/content',
        { method: 'PATCH', body: JSON.stringify(editableFields(form)) },
        adminSession.get(),
      );
      setForm(editableFields(saved));
      setNotice('Site content saved.');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save site content.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>Site content</h1>
          <p>Edit the public messaging without touching code.</p>
        </div>
      </div>

      <section className="adminPanel" style={{ maxWidth: 820 }}>
        {!loaded ? (
          <LoadingState label="Loading site content" />
        ) : (
          <form className="adminForm" onSubmit={save}>
            <label className="formField">
              <span>Brand name</span>
              <input
                className="input"
                required
                minLength={2}
                maxLength={60}
                value={form.brandName}
                onChange={(event) => setForm({ ...form, brandName: event.target.value })}
              />
            </label>
            <label className="formField">
              <span>Announcement bar</span>
              <input
                className="input"
                maxLength={160}
                value={form.announcement}
                onChange={(event) => setForm({ ...form, announcement: event.target.value })}
              />
            </label>
            <label className="formField full">
              <span>Hero title</span>
              <input
                className="input"
                required
                minLength={2}
                maxLength={120}
                value={form.heroTitle}
                onChange={(event) => setForm({ ...form, heroTitle: event.target.value })}
              />
            </label>
            <label className="formField full">
              <span>Hero subtitle</span>
              <textarea
                className="textarea"
                maxLength={400}
                value={form.heroSubtitle}
                onChange={(event) => setForm({ ...form, heroSubtitle: event.target.value })}
              />
            </label>
            <label className="formField">
              <span>Hero button</span>
              <input
                className="input"
                maxLength={60}
                value={form.heroCta}
                onChange={(event) => setForm({ ...form, heroCta: event.target.value })}
              />
            </label>
            <label className="formField">
              <span>Footer text</span>
              <input
                className="input"
                maxLength={300}
                value={form.footerText}
                onChange={(event) => setForm({ ...form, footerText: event.target.value })}
              />
            </label>

            {notice && <p className="muted full">{notice}</p>}
            {error && (
              <div className="full">
                <ErrorNote message={error} />
              </div>
            )}
            <div className="formActions">
              <button className="button sm" disabled={saving}>
                <Save size={15} />
                {saving ? 'Saving…' : 'Save content'}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
