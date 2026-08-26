'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, LayoutDashboard, LogOut, Shirt, Store, Tags, Users } from 'lucide-react';
import { adminSession } from '@/lib/auth';

const LINKS = [
  ['/admin', 'Overview', LayoutDashboard],
  ['/admin/types', 'Clothing types', Tags],
  ['/admin/members', 'Members', Users],
  ['/admin/content', 'Site content', FileText],
] as const;

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();

  return (
    <aside className="adminSidebar">
      <Link href="/admin" className="adminBrand">
        <span>
          <Shirt size={16} />
        </span>
        <div>
          Wear It
          <small>Closet CMS</small>
        </div>
      </Link>
      <nav>
        {LINKS.map(([href, label, Icon]) => (
          <Link key={href} href={href} className={path === href ? 'active' : ''}>
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="adminSideFooter">
        <Link href="/" target="_blank">
          <Store size={17} />
          View site
        </Link>
        <button
          onClick={() => {
            adminSession.clear();
            router.push('/admin/login');
          }}
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}
