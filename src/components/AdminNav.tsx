'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CreditCard, FileText, LayoutDashboard, LogOut, Shirt, Store, Tags, Users } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/context/I18nContext';
import { adminSession } from '@/lib/auth'; import { LanguageSwitch } from './LanguageSwitch';
type AdminLink=readonly[string,TranslationKey|null,typeof LayoutDashboard];const LINKS:ReadonlyArray<AdminLink>=[['/admin','admin.navOverview',LayoutDashboard],['/admin/types','admin.navTypes',Tags],['/admin/plans',null,CreditCard],['/admin/members','admin.navMembers',Users],['/admin/content','admin.navContent',FileText]];
export function AdminNav(){const path=usePathname(),router=useRouter(),{t,locale}=useI18n();return <aside className="adminSidebar"><Link href="/admin" className="adminBrand"><span><Shirt size={16}/></span><div>Wear It<small>{t('admin.brandSub')}</small></div></Link><nav>{LINKS.map(([href,key,Icon])=><Link key={href} href={href} className={path===href?'active':''}><Icon size={17}/>{key?t(key):locale==='ar'?'الخطط والأسعار':'Plans & pricing'}</Link>)}</nav><div className="adminSideFooter"><LanguageSwitch/><Link href="/" target="_blank"><Store size={17}/><span>{t('admin.viewSite')}</span></Link><button onClick={()=>{adminSession.clear();router.push('/admin/login')}}><LogOut size={17}/><span>{t('admin.logOut')}</span></button></div></aside>}
