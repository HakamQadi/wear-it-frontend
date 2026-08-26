'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { text } from '@/lib/localise';
import type { SiteContent } from '@/lib/types';

export function Footer() {
  const { t, locale, tag } = useI18n();
  const [content, setContent] = useState<Pick<SiteContent, 'brandName' | 'footerText'> | null>(null);

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setContent({ brandName: value.brandName, footerText: value.footerText }))
      .catch(() => {});
  }, []);

  const brand = text(content?.brandName, locale, 'Wear It');
  const year = new Intl.DateTimeFormat(tag, { year: 'numeric' }).format(new Date());

  return (
    <footer className="footer">
      <div>
        <div className="footerBrand">{brand}</div>
        <p>{text(content?.footerText, locale, t('home.footerDefault'))}</p>
      </div>
      <div className="footerLinks">
        <Link href="/closet">{t('nav.closet')}</Link>
        <Link href="/studio">{t('nav.studio')}</Link>
        <Link href="/admin/login">{t('admin.loginEyebrow')}</Link>
      </div>
      <div className="footerBottom">
        © {year} {brand}
      </div>
    </footer>
  );
}
