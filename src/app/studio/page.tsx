'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, LoaderCircle, LockKeyhole, Plus, Sparkles, X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ImageDrop } from '@/components/ImageDrop';
import { MemberGuard } from '@/components/MemberGuard';
import { EmptyState, ErrorNote, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { ApiError, api, mediaUrl } from '@/lib/api';
import { lookTypeName, typeName } from '@/lib/localise';
import { MAX_LOOK_ITEMS, type ClothingType, type Look, type UserPhoto, type WardrobeItem } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

const MAX_DIRECTION = 600;

function StudioContent() {
  const { token } = useAuth();
  const { t, locale, tag } = useI18n();
  const describeError = useErrorMessage();
  const [types, setTypes] = useState<ClothingType[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  /** One selected item per clothing type — picking a second one in a type replaces the first. */
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [photoId, setPhotoId] = useState('');
  const [direction, setDirection] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Look | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resultRef = useRef<HTMLElement | null>(null);
  /**
   * A ref, not state: it updates synchronously, so a double tap cannot slip a second
   * request through in the tick before React re-renders and disables the button.
   */
  const inFlight = useRef(false);

  const loadPhotos = useCallback(async () => {
    const saved = await api<UserPhoto[]>('/photos', {}, token);
    setPhotos(saved);
    return saved;
  }, [token]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<ClothingType[]>('/clothing-types'),
      api<WardrobeItem[]>('/wardrobe', {}, token),
      loadPhotos(),
      api<{ aiConfigured: boolean }>('/looks/status', {}, token).catch(() => ({ aiConfigured: true })),
    ])
      .then(([loadedTypes, loadedItems, loadedPhotos, status]) => {
        if (!active) return;
        setTypes(loadedTypes);
        setItems(loadedItems);
        setAiConfigured(status.aiConfigured);
        setPhotoId(loadedPhotos.find((photo) => photo.isDefault)?._id ?? loadedPhotos[0]?._id ?? '');
      })
      .catch((caught: unknown) => {
        if (active) setError(describeError(caught, 'studio.openFailed'));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, loadPhotos, describeError]);

  /** Wardrobe items bucketed by clothing type, in the CMS layering order. */
  const groups = useMemo(() => {
    const order = new Map(types.map((type, index) => [type._id, index]));
    const buckets = new Map<string, { type: WardrobeItem['typeId']; items: WardrobeItem[] }>();
    for (const item of items) {
      if (!item.typeId) continue;
      const bucket = buckets.get(item.typeId._id) ?? { type: item.typeId, items: [] };
      bucket.items.push(item);
      buckets.set(item.typeId._id, bucket);
    }
    return [...buckets.values()].sort(
      (a, b) => (order.get(a.type!._id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.type!._id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [items, types]);

  const selectedItems = useMemo(
    () =>
      Object.values(selection)
        .map((id) => items.find((item) => item._id === id))
        .filter((item): item is WardrobeItem => Boolean(item)),
    [selection, items],
  );

  function toggle(item: WardrobeItem) {
    if (!item.typeId) return;
    const typeId = item.typeId._id;
    setResult(null);
    setError('');
    setSelection((current) => {
      const next = { ...current };
      if (next[typeId] === item._id) delete next[typeId];
      else next[typeId] = item._id;
      return next;
    });
  }

  async function savePhoto(url: string) {
    if (!url) return;
    setError('');
    try {
      const saved = await api<UserPhoto>('/photos', { method: 'POST', body: JSON.stringify({ imageUrl: url }) }, token);
      await loadPhotos();
      setPhotoId(saved._id);
      setAddingPhoto(false);
    } catch (caught: unknown) {
      setError(describeError(caught, 'studio.savePhotoFailed'));
    }
  }

  /**
   * Generation takes about half a minute, which is a long time to keep a mobile
   * connection open through a CDN and a proxy. If the request dies in transit the backend
   * still finishes the job and saves the look, so a dropped connection is not a failure —
   * it just means the answer has to be collected rather than received. Poll for it.
   */
  async function waitForPendingLook(knownIds: Set<string>): Promise<Look | null> {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const looks = await api<Look[]>('/looks', {}, token);
        const fresh = looks.find((look) => !knownIds.has(look._id));
        if (fresh) return fresh;
      } catch {
        // Keep waiting; a dropped poll on a phone network is not a failure.
      }
    }
    return null;
  }

  async function generate() {
    if (inFlight.current || !photoId || selectedItems.length === 0) return;
    inFlight.current = true;
    setGenerating(true);
    setError('');
    setNotice('');
    setResult(null);
    // The result renders below the builder, so bring it into view straight away.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

    const knownIds = new Set(
      await api<Look[]>('/looks', {}, token)
        .then((looks) => looks.map((look) => look._id))
        .catch(() => []),
    );

    try {
      const look = await api<Look>(
        '/looks/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            itemIds: selectedItems.map((item) => item._id),
            photoId,
            prompt: direction.trim() || undefined,
          }),
        },
        token,
      );
      setResult(look);
      setError('');
    } catch (caught: unknown) {
      const status = caught instanceof ApiError ? caught.status : -1;
      // 429 -> an earlier generation is still running. 0 -> the connection never completed.
      // 5xx -> a proxy or gateway gave up on a request the backend may well have finished.
      // In all three the work is probably still on its way, so collect it instead of
      // reporting a failure. A 4xx is a real rejection and is shown as one.
      const mayStillArrive = status === 429 || status === 0 || status >= 500;

      if (mayStillArrive) {
        setNotice(t(status === 429 ? 'studio.stillRunning' : 'studio.connectionDropped'));
        const pending = await waitForPendingLook(knownIds);
        setNotice('');
        if (pending) {
          setResult(pending);
        } else {
          setError(t('studio.takingLong'));
        }
      } else {
        setError(describeError(caught, 'studio.generateFailed'));
      }
    } finally {
      inFlight.current = false;
      setGenerating(false);
    }
  }

  const selectedPhoto = photos.find((photo) => photo._id === photoId);
  const atLimit = selectedItems.length >= MAX_LOOK_ITEMS;
  const canGenerate = Boolean(photoId) && selectedItems.length > 0 && !generating;

  if (loading) {
    return (
      <>
        <Header />
        <LoadingState label={t('studio.loading')} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">{t('studio.eyebrow')}</span>
              <h1>{t('studio.title')}</h1>
              <p className="muted">{t('studio.subtitle', { max: new Intl.NumberFormat(tag).format(MAX_LOOK_ITEMS) })}</p>
            </div>
          </section>

          {!aiConfigured && (
            <ErrorNote message={t('studio.aiNotConfigured')} />
          )}

          {items.length === 0 ? (
            <EmptyState
              title={t('studio.emptyTitle')}
              text={t('studio.emptyText')}
              action={
                <Link className="button" href="/closet">
                  <Plus size={17} />
                  {t('studio.addItems')}
                </Link>
              }
            />
          ) : (
            <div className="studioLayout">
              <div className="studioPicker">
                {groups.map((group) => {
                  const typeId = group.type!._id;
                  const chosen = selection[typeId];
                  return (
                    <section className="typeGroup" key={typeId}>
                      <header>
                        <h3>{typeName(group.type, locale)}</h3>
                        <small>
                          {chosen
                            ? t('studio.selected')
                            : t('studio.available', { count: new Intl.NumberFormat(tag).format(group.items.length) })}
                        </small>
                      </header>
                      <div className="typeRow">
                        {group.items.map((item) => {
                          const isSelected = chosen === item._id;
                          const blocked = !isSelected && !chosen && atLimit;
                          return (
                            <button
                              type="button"
                              key={item._id}
                              className={`pickTile ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggle(item)}
                              disabled={blocked}
                              title={
                                blocked
                                  ? t('studio.atLimit', { max: new Intl.NumberFormat(tag).format(MAX_LOOK_ITEMS) })
                                  : item.name
                              }
                              aria-pressed={isSelected}
                            >
                              <Image src={mediaUrl(item.imageUrl)} alt={item.name} fill unoptimized sizes="140px" />
                              {isSelected && (
                                <span className="pickCheck">
                                  <Check size={13} />
                                </span>
                              )}
                              <span className="pickName">{item.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <aside className="studioPanel">
                <h3>{t('studio.yourLook')}</h3>
                {selectedItems.length === 0 ? (
                  <p className="panelHint">{t('studio.nothingPicked')}</p>
                ) : (
                  <ul className="selectionList">
                    {selectedItems.map((item) => (
                      <li key={item._id}>
                        <span className="selectionThumb">
                          <Image src={mediaUrl(item.imageUrl)} alt="" fill unoptimized sizes="44px" />
                        </span>
                        <span className="selectionText">
                          <strong>{item.name}</strong>
                          <small>{typeName(item.typeId, locale)}</small>
                        </span>
                        <button aria-label={t('studio.removeAria', { name: item.name })} onClick={() => toggle(item)}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="panelRule">{t('studio.onePerType')}</p>

                <h3 className="panelSection">{t('studio.yourPhoto')}</h3>
                {photos.length === 0 && !addingPhoto && (
                  <p className="panelHint">{t('studio.needPhoto')}</p>
                )}
                {photos.length > 0 && (
                  <div className="photoStrip">
                    {photos.map((photo) => (
                      <button
                        type="button"
                        key={photo._id}
                        className={`photoTile ${photoId === photo._id ? 'selected' : ''}`}
                        onClick={() => setPhotoId(photo._id)}
                        aria-pressed={photoId === photo._id}
                        title={photo.label || t('photos.untitled')}
                      >
                        <Image src={mediaUrl(photo.imageUrl)} alt={photo.label || t('photos.untitled')} fill unoptimized sizes="70px" />
                      </button>
                    ))}
                  </div>
                )}
                {addingPhoto ? (
                  <ImageDrop label={t('studio.newPhoto')} value="" token={token} onChange={savePhoto} onError={setError} />
                ) : (
                  <button className="button secondary sm fullWidth" onClick={() => setAddingPhoto(true)}>
                    <ImagePlus size={15} />
                    {t('studio.uploadNewPhoto')}
                  </button>
                )}

                <label className="formField panelSection">
                  <span>
                    {t('studio.extraDirection')} <em>{t('common.optional')}</em>
                  </span>
                  <textarea
                    className="textarea"
                    maxLength={MAX_DIRECTION}
                    value={direction}
                    placeholder={t('studio.directionPlaceholder')}
                    onChange={(event) => setDirection(event.target.value)}
                  />
                  <small className="fieldHint">
                    {direction.length}/{MAX_DIRECTION}
                  </small>
                </label>

                {notice && <p className="panelRule">{notice}</p>}
                <ErrorNote message={error} />
                <button className="button fullWidth" onClick={generate} disabled={!canGenerate}>
                  {generating ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                  {generating ? t('studio.generating') : t('studio.generate')}
                </button>
                {!photoId && photos.length > 0 && <p className="panelHint">{t('studio.pickPhoto')}</p>}

                <p className="privacyNote">
                  <LockKeyhole size={14} />
                  {t('studio.privacy')}
                </p>
              </aside>
            </div>
          )}

          {(generating || result) && (
            <section className="resultPanel" ref={resultRef}>
              <div className="resultCanvas">
                {generating && (
                  <div className="resultOverlay" role="status" aria-live="polite">
                    <LoaderCircle className="spin" size={34} />
                    <strong>{t('studio.renderingTitle')}</strong>
                    <span>{t('studio.renderingNote')}</span>
                  </div>
                )}
                {result?.resultImageUrl ? (
                  <Image src={mediaUrl(result.resultImageUrl)} alt={t('studio.resultEyebrow')} fill unoptimized className="resultImage" />
                ) : selectedPhoto ? (
                  <Image src={mediaUrl(selectedPhoto.imageUrl)} alt="" fill unoptimized className="resultImage dim" />
                ) : null}
              </div>
              {result && (
                <div className="resultMeta">
                  <span className="eyebrow">{t('studio.resultEyebrow')}</span>
                  <h3>{result.items.map((item) => lookTypeName(item, locale)).join(' + ')}</h3>
                  <ul>
                    {result.items.map((item) => (
                      <li key={item.itemId}>
                        <strong>{lookTypeName(item, locale)}</strong> — {item.name}
                      </li>
                    ))}
                  </ul>
                  <Link href="/looks" className="button secondary sm">
                    {t('studio.seeAllLooks')}
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function StudioPage() {
  return (
    <MemberGuard>
      <StudioContent />
    </MemberGuard>
  );
}
