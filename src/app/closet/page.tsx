'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Shirt, Sparkles, Trash2, X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ImageDrop } from '@/components/ImageDrop';
import { MemberGuard } from '@/components/MemberGuard';
import { EmptyState, ErrorNote, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { api, mediaUrl } from '@/lib/api';
import { typeName } from '@/lib/localise';
import type { ClothingType, WardrobeItem } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

type ItemForm = { name: string; typeId: string; imageUrl: string; color: string; brand: string; notes: string };

const EMPTY_FORM: ItemForm = { name: '', typeId: '', imageUrl: '', color: '', brand: '', notes: '' };

function ClosetContent() {
  const { token } = useAuth();
  const { t, locale, tag } = useI18n();
  const describeError = useErrorMessage();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [types, setTypes] = useState<ClothingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [listError, setListError] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (query: { search: string; typeId: string }) => {
      setLoading(true);
      setListError('');
      const params = new URLSearchParams();
      if (query.search.trim()) params.set('search', query.search.trim());
      if (query.typeId) params.set('typeId', query.typeId);
      try {
        setItems(await api<WardrobeItem[]>(`/wardrobe?${params}`, {}, token));
      } catch (caught: unknown) {
        setItems([]);
        setListError(describeError(caught, 'closet.loadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [token, describeError],
  );

  useEffect(() => {
    api<ClothingType[]>('/clothing-types')
      .then(setTypes)
      .catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load({ search, typeId: typeFilter }), 250);
    return () => clearTimeout(timer);
  }, [search, typeFilter, load]);

  const typeCount = useMemo(
    () => new Set(items.map((item) => item.typeId?._id).filter(Boolean)).size,
    [items],
  );
  const count = (value: number) => new Intl.NumberFormat(tag).format(value);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, typeId: types[0]?._id ?? '' });
    setFormError('');
    setOpen(true);
  }

  function startEdit(item: WardrobeItem) {
    setEditing(item);
    setForm({
      name: item.name,
      typeId: item.typeId?._id ?? '',
      imageUrl: item.imageUrl,
      color: item.color,
      brand: item.brand,
      notes: item.notes,
    });
    setFormError('');
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.imageUrl) {
      setFormError(t('closet.needPhoto'));
      return;
    }
    if (!form.typeId) {
      setFormError(t('closet.needType'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = JSON.stringify(form);
      if (editing) await api(`/wardrobe/${editing._id}`, { method: 'PATCH', body }, token);
      else await api('/wardrobe', { method: 'POST', body }, token);
      setOpen(false);
      await load({ search, typeId: typeFilter });
    } catch (caught: unknown) {
      setFormError(describeError(caught, 'closet.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: WardrobeItem) {
    if (!window.confirm(t('closet.confirmRemove', { name: item.name }))) return;
    try {
      await api(`/wardrobe/${item._id}`, { method: 'DELETE' }, token);
      await load({ search, typeId: typeFilter });
    } catch (caught: unknown) {
      setListError(describeError(caught, 'closet.removeFailed'));
    }
  }

  const filtering = Boolean(search.trim() || typeFilter);

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">{t('closet.eyebrow')}</span>
              <h1>{t('closet.title')}</h1>
              <p className="muted">
                {t('closet.countItems', { count: count(items.length) })}
                {typeCount > 0 && t('closet.countAcross', { count: count(typeCount) })}
              </p>
            </div>
            <div className="pageHeadActions">
              <Link href="/studio" className="button secondary">
                <Sparkles size={17} />
                {t('closet.createLook')}
              </Link>
              <button className="button" onClick={startCreate} disabled={types.length === 0}>
                <Plus size={17} />
                {t('closet.addItem')}
              </button>
            </div>
          </section>

          {types.length === 0 && <ErrorNote message={t('closet.noTypesWarning')} />}
          <ErrorNote message={listError} />

          <div className="filters">
            <div className="searchBox">
              <Search size={18} />
              <input
                className="input"
                value={search}
                placeholder={t('closet.searchPlaceholder')}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select className="select filterSelect" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">{t('closet.allTypes')}</option>
              {types.map((type) => (
                <option key={type._id} value={type._id}>
                  {typeName(type, locale)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingState label={t('closet.loading')} />
          ) : items.length ? (
            <div className="itemGrid">
              {items.map((item) => (
                <article className="itemCard" key={item._id}>
                  <div className="itemImageWrap">
                    <Image src={mediaUrl(item.imageUrl)} alt={item.name} fill unoptimized sizes="(max-width:700px) 50vw, 25vw" />
                    <span className="itemType">{typeName(item.typeId, locale, t('closet.noType'))}</span>
                  </div>
                  <div className="itemBody">
                    <strong>{item.name}</strong>
                    <small>{[item.brand, item.color].filter(Boolean).join(' · ') || t('closet.noBrandOrColour')}</small>
                  </div>
                  <div className="itemActions">
                    <button aria-label={t('closet.editAria', { name: item.name })} onClick={() => startEdit(item)}>
                      <Pencil size={14} />
                    </button>
                    <button aria-label={t('closet.deleteAria', { name: item.name })} onClick={() => remove(item)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : filtering ? (
            <EmptyState title={t('closet.noMatchTitle')} text={t('closet.noMatchText')} />
          ) : (
            <EmptyState
              title={t('closet.emptyTitle')}
              text={t('closet.emptyText')}
              action={
                <button className="button" onClick={startCreate} disabled={types.length === 0}>
                  <Plus size={17} />
                  {t('closet.addFirstItem')}
                </button>
              }
            />
          )}
        </div>
      </main>

      {open && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={t(editing ? 'closet.dialogEdit' : 'closet.dialogAdd')}>
          <div className="modal">
            <div className="modalHeader">
              <h3>
                <Shirt size={18} /> {t(editing ? 'closet.dialogEdit' : 'closet.dialogAdd')}
              </h3>
              <button aria-label={t('common.close')} onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form className="modalForm" onSubmit={save}>
              <ImageDrop
                label={t('closet.itemPhoto')}
                hint={t('closet.itemPhotoHint')}
                value={form.imageUrl}
                token={token}
                allowUrl
                onChange={(url) => setForm((current) => ({ ...current, imageUrl: url }))}
              />
              <div className="modalFields">
                <label className="formField">
                  <span>{t('closet.fieldName')}</span>
                  <input
                    className="input"
                    required
                    maxLength={80}
                    value={form.name}
                    placeholder={t('closet.fieldNamePlaceholder')}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </label>
                <label className="formField">
                  <span>{t('closet.fieldType')}</span>
                  <select
                    className="select"
                    required
                    value={form.typeId}
                    onChange={(event) => setForm({ ...form, typeId: event.target.value })}
                  >
                    <option value="">{t('closet.chooseType')}</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>
                        {typeName(type, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="formField">
                  <span>{t('closet.fieldColour')}</span>
                  <input
                    className="input"
                    maxLength={40}
                    value={form.color}
                    placeholder={t('closet.fieldColourPlaceholder')}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                  />
                </label>
                <label className="formField">
                  <span>{t('closet.fieldBrand')}</span>
                  <input
                    className="input"
                    maxLength={60}
                    value={form.brand}
                    placeholder={t('closet.fieldBrandPlaceholder')}
                    onChange={(event) => setForm({ ...form, brand: event.target.value })}
                  />
                </label>
                <label className="formField full">
                  <span>{t('closet.fieldNotes')}</span>
                  <textarea
                    className="textarea"
                    maxLength={400}
                    value={form.notes}
                    placeholder={t('closet.fieldNotesPlaceholder')}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </label>
              </div>
              <ErrorNote message={formError} />
              <div className="formActions">
                <button type="button" className="button secondary sm" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button className="button sm" disabled={saving}>
                  {saving ? t('closet.saving') : t(editing ? 'closet.saveEdit' : 'closet.saveNew')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

export default function ClosetPage() {
  return (
    <MemberGuard>
      <ClosetContent />
    </MemberGuard>
  );
}
