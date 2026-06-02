import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';

interface ApplicationTableProps {
  data: any[];
  isLoading: boolean;
  page: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export function ApplicationTable({ data, isLoading, page, total, limit, onPageChange }: ApplicationTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return <div className="p-8 text-center text-text-light">Loading applications...</div>;
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-text-light bg-white border border-border rounded-lg mt-4">No applications found.</div>;
  }

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden mt-4 shadow-sm">
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
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '-'}
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
      
      {totalPages > 1 && (
        <div className="bg-gray-50 p-4 border-t border-border flex items-center justify-between">
          <div className="text-[13px] text-text-light">
            Showing page <span className="font-semibold text-navy">{page}</span> of <span className="font-semibold text-navy">{totalPages}</span>
          </div>
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
        </div>
      )}
    </div>
  );
}
