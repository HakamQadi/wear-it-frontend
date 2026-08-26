'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Images, Shirt, Sparkles, Users } from 'lucide-react';
import { ErrorNote, LoadingState } from '@/components/StateViews';
import { ApiError, api } from '@/lib/api';
import { adminSession } from '@/lib/auth';
import type { AdminStats, TypeUsage } from '@/lib/types';

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usage, setUsage] = useState<TypeUsage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = adminSession.get();
    Promise.all([api<AdminStats>('/admin/stats', {}, token), api<TypeUsage[]>('/admin/type-usage', {}, token)])
      .then(([loadedStats, loadedUsage]) => {
        setStats(loadedStats);
        setUsage(loadedUsage);
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Could not load the dashboard.'));
  }, []);

  return (
    <>
      <div className="adminTop">
        <div>
          <h1>Overview</h1>
          <p>How members are using their virtual closets.</p>
        </div>
        <Link href="/admin/types" className="button sm">
          Manage clothing types <ArrowRight size={14} />
        </Link>
      </div>

      <ErrorNote message={error} />

      {!stats ? (
        <LoadingState label="Loading dashboard" />
      ) : (
        <>
          <div className="statGrid">
            <div className="statCard">
              <div className="statLabel">Members</div>
              <div className="statValue">{stats.members}</div>
              <div className="statHint">
                <Users size={11} /> Registered closets
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">Wardrobe items</div>
              <div className="statValue">{stats.items}</div>
              <div className="statHint">
                <Shirt size={11} /> Across all members
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">Generated looks</div>
              <div className="statValue">{stats.looks}</div>
              <div className="statHint">
                <Sparkles size={11} /> {stats.readyLooks} ready · {stats.failedLooks} failed
              </div>
            </div>
            <div className="statCard">
              <div className="statLabel">Personal photos</div>
              <div className="statValue">{stats.photos}</div>
              <div className="statHint">
                <Images size={11} /> Saved for reuse
              </div>
            </div>
          </div>

          <section className="adminPanel">
            <div className="adminPanelHeader">
              <div>
                <h3>Clothing types</h3>
                <p className="muted">
                  {stats.activeTypes} of {stats.types} visible to members
                </p>
              </div>
              <Link href="/admin/types" className="textButton">
                Manage
              </Link>
            </div>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Slug</th>
                    <th>Order</th>
                    <th>Items</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td className="muted">/{row.slug}</td>
                      <td>{row.sortOrder}</td>
                      <td>{row.itemCount}</td>
                      <td>
                        <span className={`status ${row.isActive ? 'active' : ''}`}>{row.isActive ? 'Visible' : 'Hidden'}</span>
                      </td>
                    </tr>
                  ))}
                  {usage.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        No clothing types yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
