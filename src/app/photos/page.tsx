'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Star, Trash2 } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ImageDrop } from '@/components/ImageDrop';
import { MemberGuard } from '@/components/MemberGuard';
import { EmptyState, ErrorNote, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { api, mediaUrl } from '@/lib/api';
import type { UserPhoto } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

function PhotosContent() {
  const { token } = useAuth();
  const { t } = useI18n();
  const describeError = useErrorMessage();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [pending, setPending] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPhotos(await api<UserPhoto[]>('/photos', {}, token));
      setError('');
    } catch (caught: unknown) {
      setError(describeError(caught, 'photos.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, describeError]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePending(url: string) {
    setPending(url);
    if (!url) return;
    setSaving(true);
    setError('');
    try {
      await api('/photos', { method: 'POST', body: JSON.stringify({ imageUrl: url, label: label.trim() }) }, token);
      setPending('');
      setLabel('');
      await load();
    } catch (caught: unknown) {
      setError(describeError(caught, 'photos.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(photo: UserPhoto) {
    try {
      await api(`/photos/${photo._id}`, { method: 'PATCH', body: JSON.stringify({ isDefault: true }) }, token);
      await load();
    } catch (caught: unknown) {
      setError(describeError(caught, 'photos.updateFailed'));
    }
  }

  async function remove(photo: UserPhoto) {
    if (!window.confirm(t('photos.confirmDelete'))) return;
    try {
      await api(`/photos/${photo._id}`, { method: 'DELETE' }, token);
      await load();
    } catch (caught: unknown) {
      setError(describeError(caught, 'photos.deleteFailed'));
    }
  }

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">{t('photos.eyebrow')}</span>
              <h1>{t('photos.title')}</h1>
              <p className="muted">{t('photos.subtitle')}</p>
            </div>
            <Link href="/studio" className="button secondary">
              <Sparkles size={17} />
              {t('closet.createLook')}
            </Link>
          </section>

          <section className="uploadPanel">
            <ImageDrop
              label={t('photos.addPhoto')}
              hint={t('photos.addPhotoHint')}
              value={pending}
              token={token}
              onChange={savePending}
              onError={setError}
            />
            <label className="formField">
              <span>{t('photos.labelField')}</span>
              <input
                className="input"
                maxLength={80}
                value={label}
                placeholder={t('photos.labelPlaceholder')}
                onChange={(event) => setLabel(event.target.value)}
                disabled={saving}
              />
              <small className="fieldHint">{t('photos.labelHint')}</small>
            </label>
          </section>

          <ErrorNote message={error} />

          {loading ? (
            <LoadingState label={t('photos.loading')} />
          ) : photos.length ? (
            <div className="photoGrid">
              {photos.map((photo) => (
                <article className={`photoCard ${photo.isDefault ? 'isDefault' : ''}`} key={photo._id}>
                  <div className="photoImageWrap">
                    <Image src={mediaUrl(photo.imageUrl)} alt={photo.label || t('photos.untitled')} fill unoptimized sizes="240px" />
                    {photo.isDefault && (
                      <span className="photoBadge">
                        <Star size={12} /> {t('photos.isDefault')}
                      </span>
                    )}
                  </div>
                  <div className="photoBody">
                    <strong>{photo.label || t('photos.untitled')}</strong>
                    <div className="photoActions">
                      {!photo.isDefault && (
                        <button className="linkButton" onClick={() => makeDefault(photo)}>
                          <Star size={12} /> {t('photos.makeDefault')}
                        </button>
                      )}
                      <button className="linkButton danger" onClick={() => remove(photo)}>
                        <Trash2 size={12} /> {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={t('photos.emptyTitle')} text={t('photos.emptyText')} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PhotosPage() {
  return (
    <MemberGuard>
      <PhotosContent />
    </MemberGuard>
  );
}
