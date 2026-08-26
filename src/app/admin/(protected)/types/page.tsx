'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { ApiError, api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { ClothingType, TypeUsage } from '@/lib/types';

type TypeForm = { name: string; slug: string; description: string; sortOrder: number; isActive: boolean };

const EMPTY: TypeForm = { name: '', slug: '', description: '', sortOrder: 0, isActive: true };

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
      setError(caught instanceof ApiError ? caught.message : 'Could not load clothing types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        slug: match?.slug ?? row.slug,
        description: match?.description ?? '',
        sortOrder: match?.sortOrder ?? row.sortOrder,
        isActive: match?.isActive ?? row.isActive,
      });
      setOpen(true);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not open this type.');
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
      setFormError(caught instanceof ApiError ? caught.message : 'Could not save this type.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: TypeUsage) {
    if (!window.confirm(`Delete "${row.name}"? Hide it instead if members still use it.`)) return;
    try {
      await api(`/clothing-types/${row._id}`, { method: 'DELETE' }, adminSession.get());
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete this type.');
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>Clothing types</h1>
          <p>The wardrobe categories every member picks from. Adding one needs no code change.</p>
        </div>
        <button className="button sm" onClick={startCreate}>
          <Plus size={15} />
          Add type
        </button>
      </div>

      <ErrorNote message={error} />

      <section className="adminPanel">
        {loading ? (
          <LoadingState label="Loading clothing types" />
        ) : (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Order</th>
                  <th>Items in use</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td className="muted">/{row.slug}</td>
                    <td>{row.sortOrder}</td>
                    <td>{row.itemCount}</td>
                    <td>
                      <span className={`status ${row.isActive ? 'active' : ''}`}>{row.isActive ? 'Visible' : 'Hidden'}</span>
                    </td>
                    <td>
                      <div className="rowActions">
                        <button aria-label={`Edit ${row.name}`} onClick={() => startEdit(row)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          aria-label={`Delete ${row.name}`}
                          onClick={() => remove(row)}
                          disabled={row.itemCount > 0}
                          title={row.itemCount > 0 ? 'Members still use this type — hide it instead' : 'Delete'}
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
                      No clothing types yet. Add the first one.
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
              <h3>{editing ? 'Edit clothing type' : 'New clothing type'}</h3>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form className="adminForm" onSubmit={save}>
              <label className="formField">
                <span>Name</span>
                <input
                  className="input"
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
                <span>Slug</span>
                <input
                  className="input"
                  required
                  pattern={SLUG_PATTERN}
                  maxLength={60}
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </label>
              <label className="formField">
                <span>Layer order</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                />
                <small className="fieldHint">Lower numbers are worn closer to the body.</small>
              </label>
              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                Visible to members
              </label>
              <label className="formField full">
                <span>Description</span>
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
                  Cancel
                </button>
                <button className="button sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
