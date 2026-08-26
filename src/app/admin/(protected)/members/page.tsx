'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { ApiError, api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { MemberRow } from '@/lib/types';

export default function MembersAdmin() {
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<MemberRow[]>('/admin/members', {}, adminSession.get())
      .then(setRows)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Could not load members.'));
  }, []);

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>Members</h1>
          <p>Closet activity per account. Wardrobe contents stay private to each member.</p>
        </div>
      </div>

      <ErrorNote message={error} />

      <section className="adminPanel">
        {!rows ? (
          <LoadingState label="Loading members" />
        ) : (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Items</th>
                  <th>Looks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td className="muted">{row.email}</td>
                    <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td>{row.itemCount}</td>
                    <td>{row.lookCount}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No members have signed up yet.
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
