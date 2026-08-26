'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Shirt } from 'lucide-react';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { ErrorNote } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const { t, dir } = useI18n();
  const describeError = useErrorMessage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const Forward = dir === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (ready && user) router.replace(user.role === 'admin' ? '/admin' : '/closet');
  }, [ready, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await login(form.email.trim(), form.password);
      router.replace(profile.role === 'admin' ? '/admin' : '/closet');
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
          <h1>{t('login.visualTitle')}</h1>
          <p>{t('login.visualText')}</p>
        </div>
        <small>{t('login.visualNote')}</small>
      </section>

      <section className="authFormWrap">
        <form className="authCard" onSubmit={submit}>
          <div className="authTop">
            <span className="eyebrow">{t('login.eyebrow')}</span>
            <LanguageSwitch compact />
          </div>
          <h2>{t('login.title')}</h2>
          <p>{t('login.subtitle')}</p>

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
            {busy ? t('login.submitting') : t('common.signIn')}
            <Forward size={17} />
          </button>
          <p className="authSwitch">
            {t('login.noAccount')} <Link href="/register">{t('login.createAccount')}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
