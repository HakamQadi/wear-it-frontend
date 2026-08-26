'use client';

import Image from 'next/image';
import { ChangeEvent, useState } from 'react';
import { Camera, Link2, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { importImage, mediaUrl, uploadImage } from '@/lib/api';
import { useErrorMessage } from '@/lib/useErrorMessage';

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Source = 'device' | 'link';

type Props = {
  label: string;
  hint?: string;
  value: string;
  token: string | null;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
  /** Offers a second option for pasting an image address. */
  allowUrl?: boolean;
};

/**
 * Adds an image either from the device or from a link. Both paths end with a stored
 * /uploads/... path: a link is downloaded by the backend, never referenced remotely.
 */
export function ImageDrop({ label, hint, value, token, onChange, onError, allowUrl = false }: Props) {
  const { t } = useI18n();
  const describeError = useErrorMessage();
  const [source, setSource] = useState<Source>('device');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');

  function fail(message: string) {
    setError(message);
    onError?.(message);
  }

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ACCEPTED_IMAGE_TYPES.split(',').includes(file.type)) {
      fail(t('imageDrop.wrongType'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      fail(t('imageDrop.tooLarge'));
      return;
    }

    setBusy(true);
    try {
      onChange(await uploadImage(file, token));
    } catch (caught: unknown) {
      fail(describeError(caught, 'imageDrop.uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function fetchLink() {
    const trimmed = link.trim();
    if (!trimmed) {
      fail(t('imageDrop.needLink'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      onChange(await importImage(trimmed, token));
      setLink('');
    } catch (caught: unknown) {
      fail(describeError(caught, 'imageDrop.importFailed'));
    } finally {
      setBusy(false);
    }
  }

  const preview = <Image src={mediaUrl(value)} alt="" fill unoptimized className="imageDropPreview" sizes="240px" />;

  return (
    <div className="imageDrop">
      <span className="imageDropLabel">{label}</span>

      {allowUrl && (
        <div className="sourceTabs" role="group" aria-label={t('imageDrop.sourceLabel', { label })}>
          <button
            type="button"
            aria-pressed={source === 'device'}
            className={source === 'device' ? 'active' : ''}
            onClick={() => {
              setSource('device');
              setError('');
            }}
          >
            <Upload size={13} /> {t('imageDrop.fromDevice')}
          </button>
          <button
            type="button"
            aria-pressed={source === 'link'}
            className={source === 'link' ? 'active' : ''}
            onClick={() => {
              setSource('link');
              setError('');
            }}
          >
            <Link2 size={13} /> {t('imageDrop.fromLink')}
          </button>
        </div>
      )}

      {allowUrl && source === 'link' ? (
        <div className={`imageDropZone ${value ? 'filled' : ''} static`}>
          {value ? (
            preview
          ) : (
            <span className="imageDropPlaceholder">
              {busy ? <LoaderCircle className="spin" size={22} /> : <Link2 size={22} />}
              <small>{busy ? t('imageDrop.fetching') : t('imageDrop.pasteAddress')}</small>
            </span>
          )}
        </div>
      ) : (
        <label className={`imageDropZone ${value ? 'filled' : ''}`}>
          {value ? (
            preview
          ) : (
            <span className="imageDropPlaceholder">
              {busy ? <LoaderCircle className="spin" size={22} /> : <Camera size={22} />}
              <small>{busy ? t('imageDrop.uploading') : t('imageDrop.choosePhoto')}</small>
            </span>
          )}
          <input type="file" accept={ACCEPTED_IMAGE_TYPES} hidden onChange={pick} disabled={busy} />
        </label>
      )}

      {allowUrl && source === 'link' && (
        <div className="linkRow">
          <input
            className="input"
            type="url"
            inputMode="url"
            dir="ltr"
            value={link}
            disabled={busy}
            placeholder={t('imageDrop.linkPlaceholder')}
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              // The parent is a form; Enter here should fetch, not submit the item.
              if (event.key === 'Enter') {
                event.preventDefault();
                fetchLink();
              }
            }}
          />
          <button type="button" className="button secondary sm" onClick={fetchLink} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={15} /> : <Link2 size={15} />}
            {t('imageDrop.fetch')}
          </button>
        </div>
      )}

      <div className="imageDropFooter">
        {hint && !error && <small>{hint}</small>}
        {error && <small className="fieldError">{error}</small>}
        {value && !busy && (
          <button type="button" className="linkButton" onClick={() => onChange('')}>
            <Trash2 size={12} /> {t('common.remove')}
          </button>
        )}
      </div>
    </div>
  );
}
