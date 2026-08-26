'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import { typeName } from '@/lib/localise';
import type { ClothingType, TypeUsage } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

type TypeForm = { name: string; nameAr: string; slug: string; description: string; sortOrder: number; isActive: boolean };

const EMPTY: TypeForm = { name: '', nameAr: '', slug: '', description: '', sortOrder: 0, isActive: true };

// Browsers compile the `pattern` attribute with the unicode-sets flag, where an unescaped
// "-" at the end of a character class is a syntax error.
const SLUG_PATTERN = '[a-z0-9\\-]+';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function ClothingTypesAdmin() {
  const { t, locale, tag } = useI18n();
  const describeError = useErrorMessage();
  const [rows, setRows] = useState<TypeUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TypeUsage | null>(null);
  const [form, setForm] = useState<TypeForm>(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<TypeUsage[]>('/admin/type-usage', {}, adminSession.get()));
      setError('');
    } catch (caught: unknown) {
      setError(describeError(caught, 'admin.typesLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [describeError]);

  useEffect(() => {
    load();
  }, [load]);

  const number = (value: number) => new Intl.NumberFormat(tag).format(value);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: (rows.at(-1)?.sortOrder ?? 0) + 10 });
    setFormError('');
    setOpen(true);
  }

  async function startEdit(row: TypeUsage) {
    setFormError('');
    try {
      const full = await api<ClothingType[]>('/clothing-types/admin/all', {}, adminSession.get());
      const match = full.find((type) => type._id === row._id);
      setEditing(row);
      setForm({
        name: match?.name ?? row.name,
        nameAr: match?.nameAr ?? row.nameAr ?? '',
        slug: match?.slug ?? row.slug,
        description: match?.description ?? '',
        sortOrder: match?.sortOrder ?? row.sortOrder,
        isActive: match?.isActive ?? row.isActive,
      });
      setOpen(true);
    } catch (caught: unknown) {
      setError(describeError(caught, 'admin.typeOpenFailed'));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const body = JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) });
      if (editing) await api(`/clothing-types/${editing._id}`, { method: 'PATCH', body }, adminSession.get());
      else await api('/clothing-types', { method: 'POST', body }, adminSession.get());
      setOpen(false);
      await load();
    } catch (caught: unknown) {
      setFormError(describeError(caught, 'admin.typeSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: TypeUsage) {
    if (!window.confirm(t('admin.confirmDeleteType', { name: typeName(row, locale) }))) return;
    try {
      await api(`/clothing-types/${row._id}`, { method: 'DELETE' }, adminSession.get());
      await load();
    } catch (caught: unknown) {
      setError(describeError(caught, 'admin.typeDeleteFailed'));
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{t('admin.typesTitle')}</h1>
          <p>{t('admin.typesSubtitle')}</p>
        </div>
        <button className="button sm" onClick={startCreate}>
          <Plus size={15} />
          {t('admin.addType')}
        </button>
      </div>

      <ErrorNote message={error} />

      <section className="adminPanel">
        {loading ? (
          <LoadingState />
        ) : (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>{t('admin.colName')}</th>
                  <th>{t('admin.colSlug')}</th>
                  <th>{t('admin.colOrder')}</th>
                  <th>{t('admin.colItemsInUse')}</th>
                  <th>{t('admin.colStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{typeName(row, locale)}</strong>
                    </td>
                    <td className="muted" dir="ltr">
                      /{row.slug}
                    </td>
                    <td>{number(row.sortOrder)}</td>
                    <td>{number(row.itemCount)}</td>
                    <td>
                      <span className={`status ${row.isActive ? 'active' : ''}`}>
                        {t(row.isActive ? 'admin.statusVisible' : 'admin.statusHidden')}
                      </span>
                    </td>
                    <td>
                      <div className="rowActions">
                        <button aria-label={t('closet.editAria', { name: typeName(row, locale) })} onClick={() => startEdit(row)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          aria-label={t('closet.deleteAria', { name: typeName(row, locale) })}
                          onClick={() => remove(row)}
                          disabled={row.itemCount > 0}
                          title={row.itemCount > 0 ? t('admin.deleteBlocked') : t('common.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      {t('admin.noTypesAddFirst')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modalHeader">
              <h3>{t(editing ? 'admin.editType' : 'admin.newType')}</h3>
              <button aria-label={t('common.close')} onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form className="adminForm" onSubmit={save}>
              <label className="formField">
                <span>{t('admin.typeNameEn')}</span>
                <input
                  className="input"
                  dir="ltr"
                  required
                  minLength={2}
                  maxLength={60}
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                      slug: editing ? form.slug : slugify(event.target.value),
                    })
                  }
                />
              </label>
              <label className="formField">
                <span>{t('admin.typeNameAr')}</span>
                <input
                  className="input"
                  dir="rtl"
                  required
                  minLength={1}
                  maxLength={60}
                  value={form.nameAr}
                  onChange={(event) => setForm({ ...form, nameAr: event.target.value })}
                />
                <small className="fieldHint">{t('admin.typeNameArHint')}</small>
              </label>
              <label className="formField">
                <span>{t('admin.typeSlug')}</span>
                <input
                  className="input"
                  dir="ltr"
                  required
                  pattern={SLUG_PATTERN}
                  maxLength={60}
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </label>
              <label className="formField">
                <span>{t('admin.typeOrder')}</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                />
                <small className="fieldHint">{t('admin.typeOrderHint')}</small>
              </label>
              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                {t('admin.typeVisible')}
              </label>
              <label className="formField full">
                <span>{t('admin.typeDescription')}</span>
                <textarea
                  className="textarea"
                  maxLength={400}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              {formError && <ErrorNote message={formError} />}
              <div className="formActions">
                <button type="button" className="button secondary sm" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button className="button sm" disabled={saving}>
                  {saving ? t('closet.saving') : t('admin.saveType')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
