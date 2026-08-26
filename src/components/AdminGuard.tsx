'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import { LoadingState } from './StateViews';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    api<SessionUser>('/auth/me', {}, token)
      .then((profile) => {
        // A member token must never unlock the CMS, even though both use the same endpoint.
        if (profile.role !== 'admin') throw new Error('not an admin');
        setReady(true);
      })
      .catch(() => {
        adminSession.clear();
        router.replace('/admin/login');
      });
  }, [router]);

  if (!ready) return <LoadingState label="Checking admin access" />;
  return <>{children}</>;
}
