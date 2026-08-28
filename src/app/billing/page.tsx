'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import { MemberGuard } from '@/components/MemberGuard';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import type { BillingStatus, Plan } from '@/lib/types';

function money(plan: Plan, locale: string) {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-US', { style: 'currency', currency: plan.currency }).format(plan.priceCents / 100);
  } catch {
    return `${(plan.priceCents / 100).toFixed(2)} ${plan.currency}`;
  }
}

export default function BillingPage() {
  const { token } = useAuth();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [planRows, status] = await Promise.all([api<Plan[]>('/plans'), api<BillingStatus>('/billing/me', {}, token)]);
    setPlans(planRows);
    setBilling(status);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const checkout = new URLSearchParams(window.location.search).get('checkout');
    if (checkout === 'canceled') setNotice(ar ? 'تم إلغاء عملية الدفع ولم يتم الخصم.' : 'Checkout was canceled. You were not charged.');
    let cancelled = false;
    const run = async () => {
      try {
        await load();
        if (checkout === 'success') {
          for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
            const status = await api<BillingStatus>('/billing/me', {}, token);
            setBilling(status);
            if (status.plan.tier === 'pro') {
              setNotice(ar ? 'تم تفعيل خطة برو.' : 'Your Pro plan is active.');
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 900));
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not load billing');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [token, load, ar]);

  async function upgrade() {
    if (!token) return;
    setBusy('checkout'); setError('');
    try {
      const result = await api<{ url: string }>('/billing/checkout', { method: 'POST' }, token);
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start checkout');
      setBusy('');
    }
  }

  async function portal() {
    if (!token) return;
    setBusy('portal'); setError('');
    try {
      const result = await api<{ url: string }>('/billing/portal', { method: 'POST' }, token);
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open billing portal');
      setBusy('');
    }
  }

  return (
    <MemberGuard>
      <main className="pageShell" style={{ maxWidth: 1080, margin: '0 auto', padding: '42px 20px 72px' }}>
        <div style={{ marginBottom: 28 }}>
          <span className="eyebrow"><Sparkles size={15} /> {ar ? 'الخطط' : 'Plans'}</span>
          <h1 style={{ marginTop: 10 }}>{ar ? 'اختر الخطة المناسبة لإنشاء إطلالاتك' : 'Choose how many AI looks you want to create'}</h1>
          <p className="muted">{ar ? 'يمكن للإدارة تعديل السعر وعدد التوليدات ومحتوى كل خطة من لوحة التحكم.' : 'Pricing, generation limits and plan copy are managed from the admin CMS.'}</p>
        </div>

        {loading ? <LoadingState label={ar ? 'جارٍ تحميل خطتك…' : 'Loading your plan…'} /> : billing && (
          <>
            <section className="adminPanel" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <small className="muted">{ar ? 'خطتك الحالية' : 'Current plan'}</small>
                  <h2 style={{ margin: '5px 0' }}>{ar ? billing.plan.nameAr : billing.plan.name}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {ar ? `استخدمت ${billing.used} من ${billing.limit} توليد` : `Used ${billing.used} of ${billing.limit} generations`}
                  </p>
                </div>
                {billing.subscription.provider === 'stripe' && (
                  <button className="button secondary" onClick={portal} disabled={Boolean(busy)}>
                    <CreditCard size={16} />{busy === 'portal' ? (ar ? 'جارٍ الفتح…' : 'Opening…') : (ar ? 'إدارة الدفع' : 'Manage billing')}
                  </button>
                )}
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', marginTop: 18 }}>
                <div style={{ width: `${Math.min(100, billing.limit ? billing.used / billing.limit * 100 : 0)}%`, height: '100%', background: 'var(--ink)' }} />
              </div>
              {billing.subscription.status === 'past_due' && <p style={{ marginTop: 14 }}>{ar ? 'توجد دفعة مستحقة. افتح إدارة الدفع لحلها.' : 'A payment needs attention. Open billing management to resolve it.'}</p>}
              {billing.subscription.cancelAtPeriodEnd && <p style={{ marginTop: 14 }}>{ar ? 'سيتم إلغاء الاشتراك في نهاية الفترة الحالية.' : 'Your subscription will cancel at the end of the current period.'}</p>}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
              {plans.map((plan) => {
                const current = plan.tier === billing.plan.tier;
                const features = ar ? plan.featuresAr : plan.features;
                return (
                  <section key={plan._id} className="adminPanel" style={{ position: 'relative' }}>
                    {current && <span className="badge" style={{ position: 'absolute', top: 16, insetInlineEnd: 16 }}>{ar ? 'الحالية' : 'Current'}</span>}
                    <h2>{ar ? plan.nameAr : plan.name}</h2>
                    <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0' }}>{money(plan, locale)}<small className="muted" style={{ fontSize: 14, fontWeight: 500 }}> / {ar ? 'شهر' : 'month'}</small></div>
                    <p className="muted">{ar ? plan.descriptionAr : plan.description}</p>
                    <strong>{plan.generationLimit} {ar ? 'توليد إطلالة شهرياً' : 'AI look generations / month'}</strong>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0', display: 'grid', gap: 10 }}>
                      {features.map((feature) => <li key={feature} style={{ display: 'flex', gap: 8 }}><Check size={16} />{feature}</li>)}
                    </ul>
                    {plan.tier === 'pro' && !current && (
                      <button className="button" onClick={upgrade} disabled={Boolean(busy) || billing.subscription.status === 'past_due' || !billing.paymentsConfigured}>
                        {busy === 'checkout' ? (ar ? 'جارٍ التحويل…' : 'Opening checkout…') : (ar ? 'الترقية إلى برو' : 'Upgrade to Pro')}
                      </button>
                    )}
                    {plan.tier === 'pro' && !current && !billing.paymentsConfigured && <p className="muted" style={{ marginTop: 10 }}>{ar ? 'الدفع غير مفعّل حالياً.' : 'Payments are not configured yet.'}</p>}
                  </section>
                );
              })}
            </div>
          </>
        )}
        {notice && <p style={{ marginTop: 18 }}>{notice}</p>}
        <ErrorNote message={error} />
      </main>
    </MemberGuard>
  );
}
