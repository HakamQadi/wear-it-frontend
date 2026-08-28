'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, LogOut, Menu, Shirt, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n, type TranslationKey } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { text } from '@/lib/localise';
import type { SiteContent } from '@/lib/types';
import { LanguageSwitch } from './LanguageSwitch';

const MEMBER_LINKS: ReadonlyArray<readonly [string, TranslationKey]> = [
  ['/closet', 'nav.closet'],
  ['/studio', 'nav.studio'],
  ['/looks', 'nav.looks'],
  ['/photos', 'nav.photos'],
];

export function Header() {
  const { user, ready, logout } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Pick<SiteContent, 'brandName' | 'announcement'> | null>(null);

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setContent({ brandName: value.brandName, announcement: value.announcement }))
      .catch(() => {});
  }, []);

  const brand = text(content?.brandName, locale, 'Wear It');
  const announcement = text(content?.announcement, locale, t('home.announcementDefault'));

  return (
    <>
      {announcement && <div className="announcement">{announcement}</div>}
      <header className="siteHeader">
        <Link href={user ? '/closet' : '/'} className="brand" aria-label={t('nav.home', { brand })}>
          <span className="brandDot"><Shirt size={17} /></span>
          {brand}
        </Link>

        <nav className={`navLinks ${open ? 'navOpen' : ''}`}>
          {user ? (
            <>
              {MEMBER_LINKS.map(([href, key]) => (
                <Link key={href} href={href} className={path === href ? 'active' : ''} onClick={() => setOpen(false)}>
                  {t(key)}
                </Link>
              ))}
              <Link href="/billing" className={path === '/billing' ? 'active' : ''} onClick={() => setOpen(false)}>
                <CreditCard size={15} /> {locale === 'ar' ? 'الخطة' : 'Plan'}
              </Link>
            </>
          ) : (
            <>
              <Link href="/#how-it-works" onClick={() => setOpen(false)}>{t('nav.howItWorks')}</Link>
              <Link href="/login" onClick={() => setOpen(false)}>{t('common.signIn')}</Link>
            </>
          )}
          <span className="navLanguage"><LanguageSwitch /></span>
        </nav>

        <div className="headerActions">
          <span className="desktopLanguage"><LanguageSwitch compact /></span>
          {!ready ? null : user ? (
            <>
              <Link className="primaryPill" href="/studio" aria-label={t('nav.createLook')}>
                <Sparkles size={16} /><span className="pillLabel">{t('nav.createLook')}</span>
              </Link>
              <button className="iconButton" aria-label={t('common.signOut')} title={t('nav.signOutOf', { email: user.email })}
                onClick={() => { logout(); router.replace('/'); }}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="primaryPill" href="/register"><span className="pillLabel">{t('nav.getStarted')}</span></Link>
          )}
          <button className="iconButton mobileMenu" aria-label={t('nav.toggleMenu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
    </>
  );
}
