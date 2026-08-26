'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MemberGuard } from '@/components/MemberGuard';
import { EmptyState, ErrorNote, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { api, mediaUrl } from '@/lib/api';
import { lookTypeName } from '@/lib/localise';
import type { Look } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

function LooksContent() {
  const { token } = useAuth();
  const { t, locale, tag } = useI18n();
  const describeError = useErrorMessage();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLooks(await api<Look[]>('/looks', {}, token));
      setError('');
    } catch (caught: unknown) {
      setError(describeError(caught, 'looks.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, describeError]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(look: Look) {
    if (!window.confirm(t('looks.confirmDelete'))) return;
    try {
      await api(`/looks/${look._id}`, { method: 'DELETE' }, token);
      await load();
    } catch (caught: unknown) {
      setError(describeError(caught, 'looks.deleteFailed'));
    }
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">{t('looks.eyebrow')}</span>
              <h1>{t('looks.title')}</h1>
              <p className="muted">{t('looks.subtitle')}</p>
            </div>
            <Link href="/studio" className="button">
              <Sparkles size={17} />
              {t('looks.createLook')}
            </Link>
          </section>

          <ErrorNote message={error} />

          {loading ? (
            <LoadingState label={t('looks.loading')} />
          ) : looks.length ? (
            <div className="lookGrid">
              {looks.map((look) => (
                <article className={`lookCard ${look.status}`} key={look._id}>
                  <div className="lookImageWrap">
                    {look.status === 'ready' && look.resultImageUrl ? (
                      <Image
                        src={mediaUrl(look.resultImageUrl)}
                        alt={t('looks.lookAlt', { items: look.items.map((item) => item.name).join('، ') })}
                        fill
                        unoptimized
                        sizes="(max-width:700px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="lookFailed">
                        <TriangleAlert size={22} />
                        <strong>{t('looks.failedTitle')}</strong>
                        <small>{look.errorMessage || t('looks.failedText')}</small>
                      </div>
                    )}
                  </div>
                  <div className="lookBody">
                    <strong>{look.items.map((item) => lookTypeName(item, locale)).join(' + ')}</strong>
                    <small>{formatDate(look.createdAt)}</small>
                    <ul className="lookItems">
                      {look.items.map((item) => (
                        <li key={item.itemId}>
                          <span className="lookThumb">
                            <Image src={mediaUrl(item.imageUrl)} alt="" fill unoptimized sizes="34px" />
                          </span>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                    <button className="linkButton danger" onClick={() => remove(look)}>
                      <Trash2 size={12} /> {t('looks.deleteLook')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('looks.emptyTitle')}
              text={t('looks.emptyText')}
              action={
                <Link className="button" href="/studio">
                  <Sparkles size={17} />
                  {t('looks.openStudio')}
                </Link>
              }
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function LooksPage() {
  return (
    <MemberGuard>
      <LooksContent />
    </MemberGuard>
  );
}
