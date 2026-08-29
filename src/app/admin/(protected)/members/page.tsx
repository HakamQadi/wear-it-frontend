'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Pagination, usePagedRows } from '@/components/Pagination';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { AssignMemberPlanResponse, MemberRow, Plan } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function MembersAdmin() {
  const { locale, t, tag } = useI18n();
  const describeError = useErrorMessage();
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [savingMemberId, setSavingMemberId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const paged = usePagedRows(rows ?? []);

  useEffect(() => {
    Promise.all([
      api<MemberRow[]>('/admin/members', {}, adminSession.get()),
      api<Plan[]>('/admin/plans', {}, adminSession.get()),
    ])
      .then(([memberRows, planRows]) => {
        setRows(memberRows);
        setPlans(planRows);
      })
      .catch((caught: unknown) => setError(describeError(caught, 'admin.membersLoadFailed')));
  }, [describeError]);

  const number = (value: number) => new Intl.NumberFormat(tag).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(tag).format(new Date(value));
  const planName = (plan: Pick<Plan, 'name' | 'nameAr'>) => locale === 'ar' ? plan.nameAr : plan.name;

  async function assignPlan(row: MemberRow) {
    const planId = selectedPlans[row._id] ?? row.plan?._id;
    if (!planId || planId === row.plan?._id) return;

    setSavingMemberId(row._id);
    setError('');
    setNotice('');
    try {
      const assigned = await api<AssignMemberPlanResponse>(
        `/admin/members/${row._id}/plan`,
        { method: 'PATCH', body: JSON.stringify({ planId }) },
        adminSession.get(),
      );
      setRows((current) => current?.map((member) => member._id === row._id
        ? { ...member, plan: assigned.plan, generationCount: assigned.generationCount }
        : member) ?? null);
      setSelectedPlans((current) => ({ ...current, [row._id]: assigned.plan._id }));
      setNotice(t('admin.memberPlanSaved', { name: row.name, plan: planName(assigned.plan) }));
    } catch (caught: unknown) {
      setError(describeError(caught, 'admin.memberPlanSaveFailed'));
    } finally {
      setSavingMemberId('');
    }
  }

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{t('admin.membersTitle')}</h1>
          <p>{t('admin.membersSubtitle')}</p>
        </div>
      </div>

      <ErrorNote message={error} />
      {notice && <p className="adminNotice" role="status">{notice}</p>}

      <section className="adminPanel">
        {!rows ? (
          <LoadingState />
        ) : (
          <>
            <div className="adminTableWrap">
              <table className="adminTable memberAdminTable">
                <thead>
                  <tr>
                    <th>{t('admin.colName')}</th>
                    <th>{t('admin.colEmail')}</th>
                    <th>{t('admin.colJoined')}</th>
                    <th>{t('admin.colPlan')}</th>
                    <th>{t('admin.colItems')}</th>
                    <th>{t('admin.colLooks')}</th>
                    <th>{t('admin.colPlanAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((row) => (
                    <tr key={row._id}>
                      <td data-label={t('admin.colName')}>
                        <strong>{row.name}</strong>
                      </td>
                      <td data-label={t('admin.colEmail')} className="muted">
                        <span dir="ltr">{row.email}</span>
                      </td>
                      <td data-label={t('admin.colJoined')}>{date(row.createdAt)}</td>
                      <td data-label={t('admin.colPlan')}>
                        {row.plan ? (
                          <div className="memberPlanMeta">
                            <strong>{planName(row.plan)}</strong>
                            <small>{t('admin.planUsage', {
                              used: number(row.generationCount),
                              limit: number(row.plan.generationLimit),
                            })}</small>
                          </div>
                        ) : <span className="muted">{t('admin.planNotAssigned')}</span>}
                      </td>
                      <td data-label={t('admin.colItems')}>{number(row.itemCount)}</td>
                      <td data-label={t('admin.colLooks')}>{number(row.lookCount)}</td>
                      <td data-label={t('admin.colPlanAction')}>
                        <div className="memberPlanControl">
                          <select
                            className="select"
                            value={selectedPlans[row._id] ?? row.plan?._id ?? ''}
                            onChange={(event) => setSelectedPlans((current) => ({
                              ...current,
                              [row._id]: event.target.value,
                            }))}
                            aria-label={t('admin.assignPlanFor', { name: row.name })}
                            disabled={Boolean(savingMemberId)}
                          >
                            <option value="" disabled>{t('admin.selectPlan')}</option>
                            {plans.map((plan) => (
                              <option key={plan._id} value={plan._id}>
                                {planName(plan)}{plan.isActive ? '' : ` — ${t('admin.planInactive')}`}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="button sm"
                            onClick={() => assignPlan(row)}
                            disabled={
                              Boolean(savingMemberId) ||
                              !selectedPlans[row._id] ||
                              selectedPlans[row._id] === row.plan?._id
                            }
                          >
                            <Save size={14} />
                            {savingMemberId === row._id ? t('admin.assigningPlan') : t('admin.assignPlan')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted memberEmptyState">
                        {t('admin.noMembers')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={paged.total} page={paged.page} onPage={paged.setPage} />
          </>
        )}
      </section>
    </>
  );
}
