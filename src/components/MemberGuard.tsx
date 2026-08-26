'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { LoadingState } from './StateViews';

/** Keeps closet, studio, looks and photos behind a member session. */
export function MemberGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [wasSignedIn, setWasSignedIn] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      setWasSignedIn(true);
      return;
    }
    // Signing out navigates on its own, so only visitors who arrived without a session are
    // sent to the sign-in page. Redirecting here as well would race that navigation.
    if (!wasSignedIn) router.replace('/login');
  }, [ready, user, wasSignedIn, router]);

  if (!ready) return <LoadingState label={t('guard.openingCloset')} />;
  if (!user) return <LoadingState label={t(wasSignedIn ? 'guard.signingOut' : 'guard.redirecting')} />;
  return <>{children}</>;
}
