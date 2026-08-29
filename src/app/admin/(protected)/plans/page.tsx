'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import { PlanTier, type Plan } from '@/lib/types';

export default function PlansAdminPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PlanTier | ''>('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Plan[]>('/admin/plans', {}, adminSession.get())
      .then(setPlans)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load plans'))
      .finally(() => setLoading(false));
  }, []);

  function edit(tier: PlanTier, patch: Partial<Plan>) {
    setPlans((current) => current.map((plan) => plan.tier === tier ? { ...plan, ...patch } : plan));
  }

  async function save(event: FormEvent, plan: Plan) {
    event.preventDefault();
    setSaving(plan.tier); setError(''); setNotice('');
    try {
      const saved = await api<Plan>(`/admin/plans/${plan.tier}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: plan.name,
          nameAr: plan.nameAr,
          description: plan.description,
          descriptionAr: plan.descriptionAr,
          priceCents: plan.tier === PlanTier.FREE ? 0 : plan.priceCents,
          currency: plan.currency,
          generationLimit: plan.generationLimit,
          features: plan.features,
          featuresAr: plan.featuresAr,
          isActive: plan.tier === PlanTier.FREE ? true : plan.isActive,
        }),
      }, adminSession.get());
      edit(plan.tier, saved);
      setNotice(ar ? 'تم حفظ الخطة.' : 'Plan saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save plan');
    } finally {
      setSaving('');
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{ar ? 'الخطط والأسعار' : 'Plans & pricing'}</h1>
          <p>{ar ? 'تحكم بالسعر وعدد توليدات الصور والنصوص الظاهرة للمستخدم.' : 'Manage pricing, monthly image-generation limits and customer-facing plan content.'}</p>
        </div>
      </div>

      {loading ? <LoadingState label={ar ? 'جارٍ تحميل الخطط…' : 'Loading plans…'} /> : (
        <div style={{ display: 'grid', gap: 22, maxWidth: 980 }}>
          {plans.map((plan) => (
            <form key={plan._id} className="adminPanel contentForm" onSubmit={(event) => save(event, plan)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div><h2 style={{ margin: 0 }}>{plan.tier === PlanTier.FREE ? 'Free' : 'Pro'}</h2><small className="muted">{plan.tier === PlanTier.FREE ? (ar ? 'خطة أساسية دائمة' : 'Permanent base tier') : (ar ? 'اشتراك شهري مدفوع' : 'Paid monthly subscription')}</small></div>
                {plan.tier === PlanTier.PRO && <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={plan.isActive} onChange={(e) => edit(plan.tier, { isActive: e.target.checked })} />{ar ? 'متاحة للشراء' : 'Available for purchase'}</label>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <label className="formField"><span>{ar ? 'الاسم بالإنجليزية' : 'English name'}</span><input className="input" value={plan.name} onChange={(e) => edit(plan.tier, { name: e.target.value })} required /></label>
                <label className="formField"><span>{ar ? 'الاسم بالعربية' : 'Arabic name'}</span><input className="input" dir="rtl" value={plan.nameAr} onChange={(e) => edit(plan.tier, { nameAr: e.target.value })} required /></label>
                <label className="formField"><span>{ar ? 'السعر الشهري' : 'Monthly price'}</span><input className="input" type="number" min={0} step="0.01" disabled={plan.tier === PlanTier.FREE} value={plan.priceCents / 100} onChange={(e) => edit(plan.tier, { priceCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} /></label>
                <label className="formField"><span>{ar ? 'العملة' : 'Currency'}</span><input className="input" maxLength={3} minLength={3} value={plan.currency} onChange={(e) => edit(plan.tier, { currency: e.target.value.toUpperCase() })} required /></label>
                <label className="formField"><span>{ar ? 'عدد التوليدات شهرياً' : 'Generations per month'}</span><input className="input" type="number" min={1} step={1} value={plan.generationLimit} onChange={(e) => edit(plan.tier, { generationLimit: Math.max(1, Number(e.target.value || 1)) })} required /></label>
              </div>

              <label className="formField"><span>{ar ? 'الوصف بالإنجليزية' : 'English description'}</span><textarea className="textarea" value={plan.description} onChange={(e) => edit(plan.tier, { description: e.target.value })} /></label>
              <label className="formField"><span>{ar ? 'الوصف بالعربية' : 'Arabic description'}</span><textarea className="textarea" dir="rtl" value={plan.descriptionAr} onChange={(e) => edit(plan.tier, { descriptionAr: e.target.value })} /></label>
              <label className="formField"><span>{ar ? 'المميزات بالإنجليزية — سطر لكل ميزة' : 'English features — one per line'}</span><textarea className="textarea" value={plan.features.join('\n')} onChange={(e) => edit(plan.tier, { features: e.target.value.split('\n').filter(Boolean) })} /></label>
              <label className="formField"><span>{ar ? 'المميزات بالعربية — سطر لكل ميزة' : 'Arabic features — one per line'}</span><textarea className="textarea" dir="rtl" value={plan.featuresAr.join('\n')} onChange={(e) => edit(plan.tier, { featuresAr: e.target.value.split('\n').filter(Boolean) })} /></label>

              <div className="formActions">
                <button className="button sm" disabled={Boolean(saving)}><Save size={15} />{saving === plan.tier ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ الخطة' : 'Save plan')}</button>
              </div>
            </form>
          ))}
          {notice && <p className="muted">{notice}</p>}
          <ErrorNote message={error} />
        </div>
      )}
    </>
  );
}
