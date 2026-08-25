'use client';
import { Search } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header'; import { Footer } from '@/components/Footer'; import { ProductCard } from '@/components/ProductCard'; import { EmptyState, LoadingState } from '@/components/StateViews';
import { api } from '@/lib/api'; import type { Category, Product } from '@/lib/types';
function ShopContent(){
  const params=useSearchParams(); const [products,setProducts]=useState<Product[]>([]); const [categories,setCategories]=useState<Category[]>([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const featured=params.get('featured')==='true';
  useEffect(()=>{api<Category[]>('/categories').then(setCategories).catch(()=>{});},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setLoading(true); const query=new URLSearchParams(); if(search)query.set('search',search);if(category)query.set('category',category);if(featured)query.set('featured','true');api<Product[]>(`/products?${query}`).then(setProducts).catch(()=>setProducts([])).finally(()=>setLoading(false));},250);return()=>clearTimeout(timer)},[search,category,featured]);
  return <><Header/><main><div className="container"><section className="shopHero"><span className="eyebrow">The collection</span><h1>{featured?'Featured now':'Shop all'}</h1><p>Clean everyday pieces with selected styles prepared for our virtual fitting room.</p></section><div className="filters"><div className="searchBox"><Search size={18}/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tees, hoodies, jackets…"/></div><select className="select filterSelect" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></div>{loading?<LoadingState label="Finding pieces"/>:products.length?<div className="productGrid" style={{paddingBottom:80}}>{products.map(p=><ProductCard key={p._id} product={p}/>)}</div>:<EmptyState title="No pieces found" text="Try a different search or category."/>}</div></main><Footer/></>;
}
export default function ShopPage(){return <Suspense fallback={<LoadingState label="Opening shop"/>}><ShopContent/></Suspense>}
