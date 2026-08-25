'use client';
import Link from 'next/link';
import { ArrowRight, Camera, ShoppingBag, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { LoadingState } from '@/components/StateViews';
import { api } from '@/lib/api';
import type { Product, SiteContent } from '@/lib/types';

const fallback: SiteContent = { brandName:'Wear It', heroTitle:'See the fit before it arrives.', heroSubtitle:'Shop modern essentials, upload a photo, and preview the silhouette on you before adding it to your wardrobe.', heroCta:'Shop the collection', announcement:'Free delivery on orders over $100', footerText:'Modern clothing with a more confident way to choose.' };
export default function Home() {
  const [products,setProducts]=useState<Product[]>([]); const [content,setContent]=useState(fallback); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([api<Product[]>('/products?featured=true'),api<SiteContent>('/content')]).then(([p,c])=>{setProducts(p);setContent(c)}).catch(()=>{}).finally(()=>setLoading(false));},[]);
  return <><Header/><main className="pageShell">
    <section className="hero"><div className="heroCopy"><span className="eyebrow">A smarter fitting room</span><h1>{content.heroTitle}</h1><p>{content.heroSubtitle}</p><div className="heroButtons"><Link href="/shop" className="button">{content.heroCta}<ArrowRight size={18}/></Link><Link href="#how-it-works" className="button secondary"><Sparkles size={17}/>How it works</Link></div></div><div className="heroVisual" aria-label="Wear It fashion illustration"><div className="heroModel"/><div className="heroCard"><span><Camera size={18}/></span><div><strong>AI virtual try-on</strong><br/><small>Your photo + garment, combined</small></div></div></div></section>
    <section className="section"><div className="container"><div className="sectionHeader"><div><span className="eyebrow">Curated now</span><h2>Fits worth trying.</h2></div><Link href="/shop" className="textButton">View all <ArrowRight size={14} style={{verticalAlign:'middle'}}/></Link></div>{loading?<LoadingState label="Loading collection"/>:<div className="productGrid">{products.slice(0,4).map(p=><ProductCard key={p._id} product={p}/>)}</div>}</div></section>
    <section className="featureBand" id="how-it-works"><div className="container"><span className="eyebrow" style={{color:'#b9cbbf'}}>AI virtual fitting room</span><h2 style={{maxWidth:620,marginTop:10}}>A clearer idea of the look in three steps.</h2><div className="steps"><div className="stepCard"><div className="stepIcon"><ShoppingBag/></div><span className="stepNo">Step 01</span><h3>Choose a piece</h3><p>Shop products that include a garment reference prepared for AI try-on.</p></div><div className="stepCard"><div className="stepIcon"><Camera/></div><span className="stepNo">Step 02</span><h3>Add your photo</h3><p>Upload a clear front-facing photo and optionally describe the result you want.</p></div><div className="stepCard"><div className="stepIcon"><Sparkles/></div><span className="stepNo">Step 03</span><h3>Generate your look</h3><p>AI combines your photo and the garment into a new image with realistic fit and lighting.</p></div></div></div></section>
  </main><Footer/></>;
}
