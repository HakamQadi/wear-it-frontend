'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Camera, LoaderCircle, LockKeyhole, ShoppingBag, Sparkles, Upload } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/StateViews';
import { api, mediaUrl } from '@/lib/api';
import {
  GenerateTryOnResponse,
  TRY_ON_ACCEPT_ATTRIBUTE,
  TRY_ON_MAX_IMAGE_BYTES,
  TRY_ON_PERSON_IMAGE_FIELD,
} from '@/lib/try-on';
import type { Product } from '@/lib/types';

export default function TryOnPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Product>(`/products/${slug}`).then(setProduct).catch(() => setError('Could not open this product.'));
  }, [slug]);

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > TRY_ON_MAX_IMAGE_BYTES) {
      setError('Choose an image smaller than 10 MB.');
      event.target.value = '';
      return;
    }
    setPersonFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGeneratedUrl('');
    setError('');
    event.target.value = '';
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!personFile || !product) return;
    const form = new FormData();
    form.append(TRY_ON_PERSON_IMAGE_FIELD, personFile);
    form.append('productSlug', product.slug);
    if (prompt.trim()) form.append('prompt', prompt.trim());

    setGenerating(true);
    setError('');
    try {
      const result = await api<GenerateTryOnResponse>('/try-on/generate', { method: 'POST', body: form });
      setGeneratedUrl(mediaUrl(result.imageUrl));
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not generate your AI try-on.');
    } finally {
      setGenerating(false);
    }
  }

  if (!product) return <><Header /><LoadingState label="Opening fitting room" /><Footer /></>;

  const displayedImage = generatedUrl || previewUrl;
  return <>
    <Header />
    <main className="tryOnPage">
      <div className="container">
        <div className="tryOnHeaderBlock">
          <span className="eyebrow"><Sparkles size={12} /> AI virtual fitting room</span>
          <h1>Wear it before you order it.</h1>
          <p>Upload a clear photo and our AI will combine it with the selected garment to create a new, realistic try-on image.</p>
        </div>
        <div className="tryWorkspace">
          <div className="tryCanvas">
            {displayedImage ? <>
              <Image
                src={displayedImage}
                alt={generatedUrl ? `AI try-on result for ${product.name}` : 'Your uploaded photo'}
                fill
                unoptimized
                className="personPhoto"
              />
              <span className={`tryImageBadge ${generatedUrl ? 'complete' : ''}`}>
                {generatedUrl ? 'AI result' : 'Original photo'}
              </span>
            </> : <div className="uploadEmpty">
              <div className="uploadCircle"><Camera size={28} /></div>
              <h3>Add a photo of yourself</h3>
              <p>Use a clear, front-facing photo with your upper body visible.</p>
              <label className="button">
                <Upload size={17} />Choose photo
                <input hidden type="file" accept={TRY_ON_ACCEPT_ATTRIBUTE} onChange={pick} />
              </label>
            </div>}
            {generating && <div className="tryGenerating" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={34} />
              <strong>Creating your AI try-on…</strong>
              <span>This can take up to a minute.</span>
            </div>}
          </div>
          <aside className="tryControls">
            <div className="tryProductMini">
              <Image src={mediaUrl(product.tryOnOverlayUrl || product.images[0])} width={54} height={66} unoptimized alt={product.name} />
              <div><strong>{product.name}</strong><small>${product.price.toFixed(2)}</small></div>
            </div>
            <form onSubmit={generate}>
              <h3>Create your AI try-on</h3>
              <p>The AI uses your photo, this garment reference, and your optional direction to make a new image.</p>
              <label className="tryPromptField">
                <span>Extra direction <em>Optional</em></span>
                <textarea
                  className="textarea"
                  maxLength={600}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: Keep my pose and background, with a natural relaxed fit."
                />
                <small>{prompt.length}/600</small>
              </label>
              {error && <p className="tryError" role="alert">{error}</p>}
              <button className="button accent tryGenerateButton" type="submit" disabled={!personFile || generating}>
                {generating ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                {generating ? 'Generating…' : generatedUrl ? 'Generate again' : 'Generate AI try-on'}
              </button>
            </form>
            {personFile && <label className="button secondary tryChangePhoto">
              <Upload size={16} />Change photo
              <input hidden type="file" accept={TRY_ON_ACCEPT_ATTRIBUTE} onChange={pick} />
            </label>}
            <Link href={`/product/${product.slug}`} className="button secondary tryProductLink">
              <ShoppingBag size={16} />Choose size &amp; add
            </Link>
            <div className="tryPrivacy">
              <LockKeyhole size={16} />
              <span>Your photo and garment reference are sent securely to OpenAI for this generation. Wear It stores only the generated result in its uploads folder.</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
