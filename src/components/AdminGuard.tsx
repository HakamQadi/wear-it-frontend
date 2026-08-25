'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authStore } from '@/lib/auth';
import { LoadingState } from './StateViews';
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [ready, setReady] = useState(false);
  useEffect(() => {
    const token = authStore.get();
    if (!token) { router.replace('/admin/login'); return; }
    api('/auth/me', {}, token).then(() => setReady(true)).catch(() => { authStore.clear(); router.replace('/admin/login'); });
  }, [router]);
  if (!ready) return <LoadingState label="Securing admin"/>;
  return children;
}
