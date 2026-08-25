import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { mediaUrl } from '@/lib/api';
import type { Product } from '@/lib/types';
export function ProductCard({ product }: { product: Product }) {
  return <article className="productCard">
    <Link href={`/product/${product.slug}`} className="productImageWrap">
      {product.featured && <span className="badge">Featured</span>}
      <Image src={mediaUrl(product.images[0])} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" className="productImage" unoptimized />
      {product.tryOnOverlayUrl && <span className="tryBadge"><Sparkles size={14}/> Try-on ready</span>}
    </Link>
    <div className="productCardInfo">
      <div><Link href={`/product/${product.slug}`} className="productName">{product.name}</Link><p>{typeof product.categoryId === 'object' ? product.categoryId.name : 'Collection'}</p></div>
      <div className="priceLine"><strong>${product.price.toFixed(2)}</strong>{product.compareAtPrice && <span>${product.compareAtPrice.toFixed(2)}</span>}</div>
    </div>
  </article>;
}
