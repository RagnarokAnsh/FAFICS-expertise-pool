'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/utils/date';

interface AuditLog {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

interface AuditTimelineProps {
  logs: AuditLog[];
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getColor = (action: string) => {
    if (action.includes('approve') || action.includes('endorsed')) return 'bg-green-500';
    if (action.includes('reject')) return 'bg-red-500';
    if (action.includes('changes')) return 'bg-amber-500';
    if (action.includes('note')) return 'bg-navy';
    if (action.includes('submit')) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  if (!logs || logs.length === 0) {
    return <div className="text-sm text-text-light">No timeline events available.</div>;
  }

  return (
    <div className="relative border-l-2 border-gray-200 ml-3 mt-4">
      {logs.map((log) => (
        <div key={log.id} className="mb-6 ml-6 relative">
          <div className={`absolute -left-[31px] top-1 w-[14px] h-[14px] rounded-full border-2 border-white shadow-sm ${getColor(log.action)}`} />
          <div className="bg-white border border-border p-3 rounded shadow-sm text-sm">
            <div className="flex justify-between items-start gap-2 mb-1">
              <span className="font-semibold text-navy capitalize break-words min-w-0">{log.action.replace(/[._]/g, ' ')}</span>
              <span className="text-xs text-text-light whitespace-nowrap shrink-0">{formatDateTime(log.createdAt)}</span>
            </div>
            <div className="text-text-mid text-[13px] mb-2 break-words">
              By: <span className="break-all">{log.actorEmail}</span> ({log.actorRole})
            </div>
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <button 
                  onClick={() => toggleExpand(log.id)}
                  className="text-xs text-gold font-medium hover:underline focus:outline-none"
                >
                  {expanded[log.id] ? 'Hide Details' : 'View Details'}
                </button>
                {expanded[log.id] && (
                  <pre className="mt-2 bg-gray-50 p-2 rounded text-[11px] text-text-mid overflow-x-auto border border-gray-100">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
