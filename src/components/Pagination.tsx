'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

/** Rows per page across the CMS tables. */
export const ADMIN_PAGE_SIZE = 10;

/**
 * Slices a fully loaded list into pages. The admin endpoints return every row, so the
 * paging is done here; the page index follows the list as rows are added or removed,
 * which keeps the view off an empty over-range page after a delete.
 */
export function usePagedRows<T>(rows: T[], pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(page, 1), pages);

  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  return {
    page: current,
    setPage,
    total: rows.length,
    pageSize,
    visible: rows.slice((current - 1) * pageSize, current * pageSize),
    /** The page a row sits on, for jumping to a row that was just saved. */
    pageOf: (index: number) => Math.floor(index / pageSize) + 1,
  };
}

type Props = {
  total: number;
  page: number;
  pageSize?: number;
  onPage: (page: number) => void;
};

/** Renders nothing while everything fits on one page. */
export function Pagination({ total, page, pageSize = ADMIN_PAGE_SIZE, onPage }: Props) {
  const { t, dir, tag } = useI18n();
  if (total <= pageSize) return null;

  const pages = Math.ceil(total / pageSize);
  const number = (value: number) => new Intl.NumberFormat(tag).format(value);
  const [Previous, Next] = dir === 'rtl' ? [ChevronRight, ChevronLeft] : [ChevronLeft, ChevronRight];

  return (
    <nav className="tablePagination" aria-label={t('admin.pagination')} data-total={total} data-page={page}>
      <span className="muted">
        {t('admin.showingRange', {
          first: number((page - 1) * pageSize + 1),
          last: number(Math.min(page * pageSize, total)),
          total: number(total),
        })}
      </span>
      <div className="pageButtons">
        <button
          type="button"
          aria-label={t('admin.previousPage')}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Previous size={16} />
        </button>
        <span>{t('admin.pageOf', { page: number(page), pages: number(pages) })}</span>
        <button type="button" aria-label={t('admin.nextPage')} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <Next size={16} />
        </button>
      </div>
    </nav>
  );
}
