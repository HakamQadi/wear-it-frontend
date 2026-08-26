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
import { ApiError, api, mediaUrl } from '@/lib/api';
import type { UserPhoto } from '@/lib/types';

function PhotosContent() {
  const { token } = useAuth();
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
      setError(caught instanceof ApiError ? caught.message : 'Could not load your photos.');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
      setError(caught instanceof ApiError ? caught.message : 'Could not save the photo.');
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(photo: UserPhoto) {
    try {
      await api(`/photos/${photo._id}`, { method: 'PATCH', body: JSON.stringify({ isDefault: true }) }, token);
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update the photo.');
    }
  }

  async function remove(photo: UserPhoto) {
    if (!window.confirm('Delete this photo? Looks already generated from it are kept.')) return;
    try {
      await api(`/photos/${photo._id}`, { method: 'DELETE' }, token);
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete the photo.');
    }
  }

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">My photos</span>
              <h1>Photos of you.</h1>
              <p className="muted">
                Save a few clear, front-facing full-body photos once, then reuse them every time you build a look.
              </p>
            </div>
            <Link href="/studio" className="button secondary">
              <Sparkles size={17} />
              Create a look
            </Link>
          </section>

          <section className="uploadPanel">
            <ImageDrop
              label="Add a photo"
              hint="Front-facing, good light, full body if you can."
              value={pending}
              token={token}
              onChange={savePending}
              onError={setError}
            />
            <label className="formField">
              <span>Label (optional)</span>
              <input
                className="input"
                maxLength={80}
                value={label}
                placeholder="Standing, daylight"
                onChange={(event) => setLabel(event.target.value)}
                disabled={saving}
              />
              <small className="fieldHint">Set the label before choosing the photo — it is saved straight away.</small>
            </label>
          </section>

          <ErrorNote message={error} />

          {loading ? (
            <LoadingState label="Loading your photos" />
          ) : photos.length ? (
            <div className="photoGrid">
              {photos.map((photo) => (
                <article className={`photoCard ${photo.isDefault ? 'isDefault' : ''}`} key={photo._id}>
                  <div className="photoImageWrap">
                    <Image src={mediaUrl(photo.imageUrl)} alt={photo.label || 'Saved photo'} fill unoptimized sizes="240px" />
                    {photo.isDefault && (
                      <span className="photoBadge">
                        <Star size={12} /> Default
                      </span>
                    )}
                  </div>
                  <div className="photoBody">
                    <strong>{photo.label || 'Untitled photo'}</strong>
                    <div className="photoActions">
                      {!photo.isDefault && (
                        <button className="linkButton" onClick={() => makeDefault(photo)}>
                          <Star size={12} /> Make default
                        </button>
                      )}
                      <button className="linkButton danger" onClick={() => remove(photo)}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No photos yet" text="Add one photo of yourself and you can generate looks from it right away." />
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
