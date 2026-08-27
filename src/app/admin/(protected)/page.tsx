'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Images, Shirt, Sparkles, Users } from 'lucide-react';
import { Pagination, usePagedRows } from '@/components/Pagination';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import { typeName } from '@/lib/localise';
import type { AdminStats, TypeUsage } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function AdminOverview() {
  const { t, locale, dir, tag } = useI18n();
  const describeError = useErrorMessage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usage, setUsage] = useState<TypeUsage[]>([]);
  const [error, setError] = useState('');
  const paged = usePagedRows(usage);

  useEffect(() => {
    const token = adminSession.get();
    Promise.all([api<AdminStats>('/admin/stats', {}, token), api<TypeUsage[]>('/admin/type-usage', {}, token)])
      .then(([loadedStats, loadedUsage]) => {
        setStats(loadedStats);
        setUsage(loadedUsage);
      })
      .catch((caught: unknown) => setError(describeError(caught, 'admin.dashboardLoadFailed')));
  }, [describeError]);

  const Forward = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const number = (value: number) => new Intl.NumberFormat(tag).format(value);

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{t('admin.overviewTitle')}</h1>
          <p>{t('admin.overviewSubtitle')}</p>
        </div>
        <Link href="/admin/types" className="button sm">
          {t('admin.manageTypes')} <Forward size={14} />
        </Link>
      </div>

      <ErrorNote message={error} />

      {!stats ? (
        <LoadingState />
      ) : (
        <>
          <div className="statGrid">
            <div className="statCard">
              <div className="statLabel">{t('admin.statMembers')}</div>
              <div className="statValue">{number(stats.members)}</div>
              <div className="statHint">
                <Users size={11} /> {t('admin.statMembersHint')}
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">{t('admin.statItems')}</div>
              <div className="statValue">{number(stats.items)}</div>
              <div className="statHint">
                <Shirt size={11} /> {t('admin.statItemsHint')}
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">{t('admin.statLooks')}</div>
              <div className="statValue">{number(stats.looks)}</div>
              <div className="statHint">
                <Sparkles size={11} />{' '}
                {t('admin.statLooksHint', { ready: number(stats.readyLooks), failed: number(stats.failedLooks) })}
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">{t('admin.statPhotos')}</div>
              <div className="statValue">{number(stats.photos)}</div>
              <div className="statHint">
                <Images size={11} /> {t('admin.statPhotosHint')}
              </div>
            </div>
          </div>

          <section className="adminPanel">
            <div className="adminPanelHeader">
              <div>
                <h3>{t('admin.typesPanelTitle')}</h3>
                <p className="muted">
                  {t('admin.typesVisible', { active: number(stats.activeTypes), total: number(stats.types) })}
                </p>
              </div>
              <Link href="/admin/types" className="textButton">
                {t('admin.manage')}
              </Link>
            </div>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>{t('admin.colType')}</th>
                    <th>{t('admin.colSlug')}</th>
                    <th>{t('admin.colOrder')}</th>
                    <th>{t('admin.colItems')}</th>
                    <th>{t('admin.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{typeName(row, locale)}</strong>
                      </td>
                      <td className="muted" dir="ltr">
                        /{row.slug}
                      </td>
                      <td>{number(row.sortOrder)}</td>
                      <td>{number(row.itemCount)}</td>
                      <td>
                        <span className={`status ${row.isActive ? 'active' : ''}`}>
                          {t(row.isActive ? 'admin.statusVisible' : 'admin.statusHidden')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {usage.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        {t('admin.noTypes')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={paged.total} page={paged.page} onPage={paged.setPage} />
          </section>
        </>
      )}
    </>
  );
}
