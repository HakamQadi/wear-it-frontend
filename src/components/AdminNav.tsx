'use client';
import Link from 'next/link';
import { Boxes, ClipboardList, FileText, LayoutDashboard, LogOut, Shirt, Store } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { authStore } from '@/lib/auth';
const links = [
  ['/admin', 'Overview', LayoutDashboard], ['/admin/products', 'Products', Shirt], ['/admin/categories', 'Categories', Boxes],
  ['/admin/orders', 'Orders', ClipboardList], ['/admin/content', 'Store content', FileText],
] as const;
export function AdminNav() {
  const path = usePathname(); const router = useRouter();
  return <aside className="adminSidebar">
    <Link href="/admin" className="adminBrand"><span>W</span><div>Wear It<small>Store manager</small></div></Link>
    <nav>{links.map(([href, label, Icon]) => <Link key={href} className={path === href ? 'active' : ''} href={href}><Icon size={18}/>{label}</Link>)}</nav>
    <div className="adminSideFooter"><Link href="/" target="_blank"><Store size={18}/>View store</Link><button onClick={() => { authStore.clear(); router.push('/admin/login'); }}><LogOut size={18}/>Log out</button></div>
  </aside>;
}
