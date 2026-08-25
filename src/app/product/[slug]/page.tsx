'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/StateViews';
import { useCart } from '@/context/CartContext';
import { api, mediaUrl } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Product>(`/products/${slug}`)
      .then((loadedProduct) => {
        setProduct(loadedProduct);
        setSize(loadedProduct.sizes[0] || '');
        setColor(loadedProduct.colors[0] || '');
      })
      .catch((caughtError: unknown) => setError(caughtError instanceof Error ? caughtError.message : 'Product unavailable'));
  }, [slug]);

  if (!product) return <>
    <Header />
    <main className="container">
      {error
        ? <div className="stateView"><h3>Product unavailable</h3><p>{error}</p><Link className="button" href="/shop">Back to shop</Link></div>
        : <LoadingState label="Loading product" />}
    </main>
    <Footer />
  </>;

  const category = typeof product.categoryId === 'object' ? product.categoryId.name : 'Collection';
  return <>
    <Header />
    <main className="productPage">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/shop">Shop</Link><ChevronRight size={13} /><span>{category}</span><ChevronRight size={13} /><span>{product.name}</span>
        </div>
        <div className="productDetail">
          <div className="detailMedia">
            <Image src={mediaUrl(product.images[0])} fill unoptimized sizes="(max-width:800px) 100vw, 50vw" alt={product.name} className="detailImage" />
          </div>
          <div className="detailInfo">
            <div className="detailCategory">{category}</div>
            <h1>{product.name}</h1>
            <div className="detailPrice">
              ${product.price.toFixed(2)}{product.compareAtPrice && <span>${product.compareAtPrice.toFixed(2)}</span>}
            </div>
            <p className="detailDescription">{product.description}</p>
            <div className="optionGroup">
              <div className="optionHeader"><span>Size</span></div>
              <div className="optionButtons">
                {product.sizes.map((value) => <button className={`optionButton ${size === value ? 'selected' : ''}`} key={value} onClick={() => setSize(value)}>{value}</button>)}
              </div>
            </div>
            <div className="optionGroup">
              <div className="optionHeader"><span>Color</span></div>
              <div className="optionButtons">
                {product.colors.map((value) => <button className={`optionButton ${color === value ? 'selected' : ''}`} key={value} onClick={() => setColor(value)}>{value}</button>)}
              </div>
            </div>
            <div className="stockLine"><span className="stockDot" />{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</div>
            <div className="detailActions">
              <button className="button" disabled={product.stock < 1} onClick={() => { add(product, size, color); router.push('/cart'); }}>
                <ShoppingBag size={18} />Add to cart
              </button>
              {product.tryOnOverlayUrl
                ? <Link className="button secondary" href={`/try-on/${product.slug}`}><Sparkles size={18} />AI try-on</Link>
                : <button className="button secondary" disabled>No try-on asset</button>}
            </div>
            <div className="tryPrivacy">
              <Check size={15} /><span>Your photo is sent securely to the AI image service only when you generate a try-on.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
