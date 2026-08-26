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
import { ApiError, api, mediaUrl } from '@/lib/api';
import type { Look } from '@/lib/types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function LooksContent() {
  const { token } = useAuth();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLooks(await api<Look[]>('/looks', {}, token));
      setError('');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load your looks.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(look: Look) {
    if (!window.confirm('Delete this look? The generated image is removed for good.')) return;
    try {
      await api(`/looks/${look._id}`, { method: 'DELETE' }, token);
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete the look.');
    }
  }

  return (
    <>
      <Header />
      <main className="pageShell">
        <div className="container">
          <section className="pageHead">
            <div>
              <span className="eyebrow">My looks</span>
              <h1>Outfits you have tried on.</h1>
              <p className="muted">Every look keeps the pieces it was built from, even if you later remove them from your closet.</p>
            </div>
            <Link href="/studio" className="button">
              <Sparkles size={17} />
              Create a look
            </Link>
          </section>

          <ErrorNote message={error} />

          {loading ? (
            <LoadingState label="Loading your looks" />
          ) : looks.length ? (
            <div className="lookGrid">
              {looks.map((look) => (
                <article className={`lookCard ${look.status}`} key={look._id}>
                  <div className="lookImageWrap">
                    {look.status === 'ready' && look.resultImageUrl ? (
                      <Image
                        src={mediaUrl(look.resultImageUrl)}
                        alt={`Look with ${look.items.map((item) => item.name).join(', ')}`}
                        fill
                        unoptimized
                        sizes="(max-width:700px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="lookFailed">
                        <TriangleAlert size={22} />
                        <strong>Generation failed</strong>
                        <small>{look.errorMessage || 'The image service could not complete this look.'}</small>
                      </div>
                    )}
                  </div>
                  <div className="lookBody">
                    <strong>{look.items.map((item) => item.typeName).join(' + ')}</strong>
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
                      <Trash2 size={12} /> Delete look
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No looks yet"
              text="Combine a few closet items in the studio and your generated outfits will collect here."
              action={
                <Link className="button" href="/studio">
                  <Sparkles size={17} />
                  Open the studio
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
