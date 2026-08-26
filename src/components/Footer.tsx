'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SiteContent } from '@/lib/types';

export function Footer() {
  const [content, setContent] = useState({
    brandName: 'Wear It',
    footerText: 'A digital wardrobe that shows you the outfit before you wear it.',
  });

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setContent({ brandName: value.brandName, footerText: value.footerText }))
      .catch(() => {});
  }, []);

  return (
    <footer className="footer">
      <div>
        <div className="footerBrand">{content.brandName}</div>
        <p>{content.footerText}</p>
      </div>
      <div className="footerLinks">
        <Link href="/closet">My closet</Link>
        <Link href="/studio">Outfit studio</Link>
        <Link href="/admin/login">Admin</Link>
      </div>
      <div className="footerBottom">
        © {new Date().getFullYear()} {content.brandName}. Your photos stay in your account.
      </div>
    </footer>
  );
}
