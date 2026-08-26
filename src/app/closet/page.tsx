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
import { ApiError, api, mediaUrl } from '@/lib/api';
import type { ClothingType, WardrobeItem } from '@/lib/types';

type ItemForm = { name: string; typeId: string; imageUrl: string; color: string; brand: string; notes: string };

const EMPTY_FORM: ItemForm = { name: '', typeId: '', imageUrl: '', color: '', brand: '', notes: '' };

function ClosetContent() {
  const { token } = useAuth();
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
        setListError(caught instanceof ApiError ? caught.message : 'Could not load your closet.');
      } finally {
        setLoading(false);
      }
    },
    [token],
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

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = item.typeId?.name ?? 'Uncategorised';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

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
      setFormError('Add a photo of the item first.');
      return;
    }
    if (!form.typeId) {
      setFormError('Pick a clothing type.');
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
      setFormError(caught instanceof ApiError ? caught.message : 'Could not save the item.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: WardrobeItem) {
    if (!window.confirm(`Remove "${item.name}" from your closet? Looks you already generated are kept.`)) return;
    try {
      await api(`/wardrobe/${item._id}`, { method: 'DELETE' }, token);
      await load({ search, typeId: typeFilter });
    } catch (caught: unknown) {
      setListError(caught instanceof ApiError ? caught.message : 'Could not remove the item.');
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
              <span className="eyebrow">My closet</span>
              <h1>Your virtual wardrobe.</h1>
              <p className="muted">
                {items.length} item{items.length === 1 ? '' : 's'}
                {counts.size > 0 && ` across ${counts.size} clothing type${counts.size === 1 ? '' : 's'}`}.
              </p>
            </div>
            <div className="pageHeadActions">
              <Link href="/studio" className="button secondary">
                <Sparkles size={17} />
                Create a look
              </Link>
              <button className="button" onClick={startCreate} disabled={types.length === 0}>
                <Plus size={17} />
                Add item
              </button>
            </div>
          </section>

          {types.length === 0 && (
            <ErrorNote message="No clothing types are available yet. An administrator needs to add them in the CMS." />
          )}
          <ErrorNote message={listError} />

          <div className="filters">
            <div className="searchBox">
              <Search size={18} />
              <input
                className="input"
                value={search}
                placeholder="Search by name, brand or colour…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select className="select filterSelect" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">All clothing types</option>
              {types.map((type) => (
                <option key={type._id} value={type._id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingState label="Loading your closet" />
          ) : items.length ? (
            <div className="itemGrid">
              {items.map((item) => (
                <article className="itemCard" key={item._id}>
                  <div className="itemImageWrap">
                    <Image src={mediaUrl(item.imageUrl)} alt={item.name} fill unoptimized sizes="(max-width:700px) 50vw, 25vw" />
                    <span className="itemType">{item.typeId?.name ?? 'No type'}</span>
                  </div>
                  <div className="itemBody">
                    <strong>{item.name}</strong>
                    <small>{[item.brand, item.color].filter(Boolean).join(' · ') || 'No brand or colour set'}</small>
                  </div>
                  <div className="itemActions">
                    <button aria-label={`Edit ${item.name}`} onClick={() => startEdit(item)}>
                      <Pencil size={14} />
                    </button>
                    <button aria-label={`Delete ${item.name}`} onClick={() => remove(item)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : filtering ? (
            <EmptyState title="Nothing matches" text="Try another search term or clothing type." />
          ) : (
            <EmptyState
              title="Your closet is empty"
              text="Photograph a piece you own, give it a clothing type, and it becomes part of your virtual wardrobe."
              action={
                <button className="button" onClick={startCreate} disabled={types.length === 0}>
                  <Plus size={17} />
                  Add your first item
                </button>
              }
            />
          )}
        </div>
      </main>

      {open && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={editing ? 'Edit item' : 'Add item'}>
          <div className="modal">
            <div className="modalHeader">
              <h3>
                <Shirt size={18} /> {editing ? 'Edit item' : 'Add a closet item'}
              </h3>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form className="modalForm" onSubmit={save}>
              <ImageDrop
                label="Item photo"
                hint="Take a flat, well-lit photo, or paste the address of one from a shop."
                value={form.imageUrl}
                token={token}
                allowUrl
                onChange={(url) => setForm((current) => ({ ...current, imageUrl: url }))}
              />
              <div className="modalFields">
                <label className="formField">
                  <span>Name</span>
                  <input
                    className="input"
                    required
                    maxLength={80}
                    value={form.name}
                    placeholder="Sand oversized tee"
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </label>
                <label className="formField">
                  <span>Clothing type</span>
                  <select
                    className="select"
                    required
                    value={form.typeId}
                    onChange={(event) => setForm({ ...form, typeId: event.target.value })}
                  >
                    <option value="">Choose a type</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="formField">
                  <span>Colour</span>
                  <input
                    className="input"
                    maxLength={40}
                    value={form.color}
                    placeholder="Sand"
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                  />
                </label>
                <label className="formField">
                  <span>Brand</span>
                  <input
                    className="input"
                    maxLength={60}
                    value={form.brand}
                    placeholder="Optional"
                    onChange={(event) => setForm({ ...form, brand: event.target.value })}
                  />
                </label>
                <label className="formField full">
                  <span>Notes</span>
                  <textarea
                    className="textarea"
                    maxLength={400}
                    value={form.notes}
                    placeholder="Fits loose, best with dark denim…"
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </label>
              </div>
              <ErrorNote message={formError} />
              <div className="formActions">
                <button type="button" className="button secondary sm" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="button sm" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to closet'}
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
