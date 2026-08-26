'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { useI18n } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { MemberRow } from '@/lib/types';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function MembersAdmin() {
  const { t, tag } = useI18n();
  const describeError = useErrorMessage();
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<MemberRow[]>('/admin/members', {}, adminSession.get())
      .then(setRows)
      .catch((caught: unknown) => setError(describeError(caught, 'admin.membersLoadFailed')));
  }, [describeError]);

  const number = (value: number) => new Intl.NumberFormat(tag).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(tag).format(new Date(value));

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>{t('admin.membersTitle')}</h1>
          <p>{t('admin.membersSubtitle')}</p>
        </div>
      </div>

      <ErrorNote message={error} />

      <section className="adminPanel">
        {!rows ? (
          <LoadingState />
        ) : (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>{t('admin.colName')}</th>
                  <th>{t('admin.colEmail')}</th>
                  <th>{t('admin.colJoined')}</th>
                  <th>{t('admin.colItems')}</th>
                  <th>{t('admin.colLooks')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td className="muted" dir="ltr">
                      {row.email}
                    </td>
                    <td>{date(row.createdAt)}</td>
                    <td>{number(row.itemCount)}</td>
                    <td>{number(row.lookCount)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      {t('admin.noMembers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
