'use client';
import Link from 'next/link';
import { Menu, Search, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';
import type { SiteContent } from '@/lib/types';

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Pick<SiteContent,'brandName'|'announcement'>>({brandName:'Wear It',announcement:'Try it on virtually before you order.'});
  useEffect(() => { api<SiteContent>('/content').then((value) => setContent({brandName:value.brandName,announcement:value.announcement})).catch(() => {}); }, []);
  return <>
    <div className="announcement">{content.announcement}</div>
    <header className="siteHeader">
      <Link href="/" className="brand" aria-label="Wear It home"><span className="brandDot">W</span> {content.brandName}</Link>
      <nav className={`navLinks ${open ? 'navOpen' : ''}`}>
        <Link href="/shop" onClick={() => setOpen(false)}>Shop</Link>
        <Link href="/shop?featured=true" onClick={() => setOpen(false)}>New & featured</Link>
        <Link href="/#how-it-works" onClick={() => setOpen(false)}>How try-on works</Link>
      </nav>
      <div className="headerActions">
        <Link className="iconButton desktopSearch" href="/shop" aria-label="Search"><Search size={20} /></Link>
        <Link className="tryOnHeader" href="/shop"><Sparkles size={17} /> Try on</Link>
        <Link className="iconButton cartButton" href="/cart" aria-label={`Cart with ${count} items`}><ShoppingBag size={20} />{count > 0 && <span>{count}</span>}</Link>
        <button className="iconButton mobileMenu" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
      </div>
    </header>
  </>;
}
