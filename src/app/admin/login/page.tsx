'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Shirt } from 'lucide-react';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { ErrorNote } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { AuthResponse, SessionUser } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function AdminLogin() {
  const router = useRouter();
  const { t, dir } = useI18n();
  const describeError = useErrorMessage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const Forward = dir === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    api<SessionUser>('/auth/me', {}, token)
      .then((profile) => (profile.role === 'admin' ? router.replace('/admin') : adminSession.clear()))
      .catch(() => adminSession.clear());
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      if (session.user.role !== 'admin') {
        setError(t('admin.notAdmin'));
        setBusy(false);
        return;
      }
      adminSession.set(session.accessToken);
      router.replace('/admin');
    } catch (caught: unknown) {
      setError(describeError(caught, 'login.failed'));
      setBusy(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link href="/" className="brand light">
          <span className="brandDot light">
            <Shirt size={17} />
          </span>
          Wear It
        </Link>
        <div className="authQuote">
          <h1>{t('admin.loginVisualTitle')}</h1>
          <p>{t('admin.loginVisualText')}</p>
        </div>
        <small>{t('admin.loginVisualNote')}</small>
      </section>

      <section className="authFormWrap">
        <form className="authCard" onSubmit={submit}>
          <div className="authTop">
            <span className="eyebrow">{t('admin.loginEyebrow')}</span>
            <LanguageSwitch compact />
          </div>
          <h2>{t('admin.loginTitle')}</h2>
          <p>{t('admin.loginSubtitle')}</p>

          <label className="formField">
            <span>{t('common.email')}</span>
            <input
              className="input"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="formField">
            <span>{t('common.password')}</span>
            <input
              className="input"
              type="password"
              dir="ltr"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>

          <ErrorNote message={error} />
          <button className="button" type="submit" disabled={busy}>
            <LockKeyhole size={17} />
            {busy ? t('login.submitting') : t('common.signIn')}
            <Forward size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
