import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import { formatDate } from '@/lib/utils/date';

interface ApplicationTableProps {
  data: any[];
  isLoading: boolean;
  page: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ApplicationTable({ data, isLoading, page, total, limit, onPageChange, onRefresh, isRefreshing }: ApplicationTableProps) {
  const effectiveTotal = total || data.length;
  const totalPages = Math.ceil(effectiveTotal / limit);
  const start = (page - 1) * limit + 1;
  const end = start + data.length - 1;

  if (isLoading) {
    return <div className="p-8 text-center text-text-light">Loading applications...</div>;
  }

  const refreshButton = onRefresh ? (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg
        className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  ) : null;

  if (data.length === 0) {
    return (
      <div className="bg-white border border-border rounded-lg mt-4 shadow-sm">
        {refreshButton && (
          <div className="flex items-center justify-end px-4 py-2.5 border-b border-border">{refreshButton}</div>
        )}
        <div className="p-8 text-center text-text-light">No applications found.</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden mt-4 shadow-sm">
      {refreshButton && (
        <div className="flex items-center justify-end px-4 py-2.5 border-b border-border">{refreshButton}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Reference No</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Association</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Country</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Status</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Submitted</th>
              <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((app) => (
              <tr key={app.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-[14px] text-text-mid font-mono">{app.referenceNumber}</td>
                <td className="py-3 px-4 text-[14px] text-navy font-semibold">{[app.firstName, app.lastName].filter(Boolean).join(' ')}</td>
                <td className="py-3 px-4 text-[14px] text-text-mid">{app.associationName}</td>
                <td className="py-3 px-4 text-[14px] text-text-mid">{app.associationCountry}</td>
                <td className="py-3 px-4">
                  <Badge status={app.status} />
                </td>
                <td className="py-3 px-4 text-[14px] text-text-light">
                  {formatDate(app.submittedAt)}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link 
                    href={`/admin/applications/${app.id}`}
                    className="text-[13px] font-semibold text-gold hover:text-gold-hover hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-50 p-4 border-t border-border flex items-center justify-between">
        <div className="text-[13px] text-text-light">
          Showing <span className="font-semibold text-navy">{start}</span>&ndash;<span className="font-semibold text-navy">{end}</span> of <span className="font-semibold text-navy">{effectiveTotal}</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
