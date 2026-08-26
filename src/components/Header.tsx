'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Menu, Shirt, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { SiteContent } from '@/lib/types';

const MEMBER_LINKS = [
  ['/closet', 'My closet'],
  ['/studio', 'Outfit studio'],
  ['/looks', 'My looks'],
  ['/photos', 'My photos'],
] as const;

export function Header() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState({ brandName: 'Wear It', announcement: '' });

  useEffect(() => {
    api<SiteContent>('/content')
      .then((value) => setContent({ brandName: value.brandName, announcement: value.announcement }))
      .catch(() => {});
  }, []);

  return (
    <>
      {content.announcement && <div className="announcement">{content.announcement}</div>}
      <header className="siteHeader">
        <Link href={user ? '/closet' : '/'} className="brand" aria-label={`${content.brandName} home`}>
          <span className="brandDot">
            <Shirt size={17} />
          </span>
          {content.brandName}
        </Link>

        <nav className={`navLinks ${open ? 'navOpen' : ''}`}>
          {user ? (
            MEMBER_LINKS.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? 'active' : ''} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))
          ) : (
            <>
              <Link href="/#how-it-works" onClick={() => setOpen(false)}>
                How it works
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </>
          )}
        </nav>

        <div className="headerActions">
          {!ready ? null : user ? (
            <>
              <Link className="primaryPill" href="/studio" aria-label="Create a look">
                <Sparkles size={16} />
                <span className="pillLabel">Create a look</span>
              </Link>
              <button
                className="iconButton"
                aria-label="Sign out"
                title={`Sign out of ${user.email}`}
                onClick={() => {
                  logout();
                  router.replace('/');
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="primaryPill" href="/register">
              Get started
            </Link>
          )}
          <button className="iconButton mobileMenu" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
    </>
  );
}
