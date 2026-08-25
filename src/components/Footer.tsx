'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SiteContent } from '@/lib/types';
export function Footer() {
  const [content,setContent]=useState<Pick<SiteContent,'brandName'|'footerText'>>({brandName:'Wear It',footerText:'Modern clothing with a more confident way to choose.'});
  useEffect(()=>{api<SiteContent>('/content').then(v=>setContent({brandName:v.brandName,footerText:v.footerText})).catch(()=>{})},[]);
  return <footer className="footer">
    <div><div className="footerBrand">{content.brandName}</div><p>{content.footerText}</p></div>
    <div className="footerLinks"><Link href="/shop">Shop</Link><Link href="/#how-it-works">Virtual try-on</Link><Link href="/admin/login">Admin</Link></div>
    <div className="footerBottom">© {new Date().getFullYear()} {content.brandName}. Demo commerce platform.</div>
  </footer>;
}
