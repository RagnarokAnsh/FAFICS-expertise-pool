'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { EndorsementView } from '@/components/endorse/EndorsementView';
import { ActionButtons } from '@/components/admin/ActionButtons';
import { AuditTimeline } from '@/components/admin/AuditTimeline';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface PageProps {
  params: { id: string };
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['application', params.id],
    queryFn: () => adminApi.getApplication(params.id),
  });

  if (isLoading) {
    return <div className="p-8 text-text-light">Loading application details...</div>;
  }

  if (isError || !app) {
    return <div className="p-8 text-red-500">Failed to load application details.</div>;
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Link href="/admin/applications" className="text-[13px] font-semibold text-gold hover:text-gold-hover hover:underline inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Applications
        </Link>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Left Column - Application Profile */}
        <div className="flex-1 xl:w-2/3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-[28px] font-bold text-navy">{app.applicantFullName}</h1>
              <p className="text-text-mid font-mono text-[14px]">{app.referenceNumber}</p>
            </div>
            <div className="xl:hidden">
              <Badge status={app.status} />
            </div>
          </div>

          {app.presidentNotes && (
            <div className="mb-6 border border-gold bg-gold/10 p-5 rounded-lg">
              <h3 className="text-[12px] font-semibold text-navy uppercase mb-2">President's Comments</h3>
              <p className="text-[14px] text-navy italic">"{app.presidentNotes}"</p>
            </div>
          )}

          {app.secretaryNotes && (
            <div className="mb-6 border border-navy bg-navy/5 p-5 rounded-lg">
              <h3 className="text-[12px] font-semibold text-navy uppercase mb-2">Secretary's / Internal Notes</h3>
              <p className="text-[14px] text-navy italic">"{app.secretaryNotes}"</p>
            </div>
          )}
          
          {app.internalNotes && (
             <div className="mb-6 border border-navy bg-navy/5 p-5 rounded-lg">
             <h3 className="text-[12px] font-semibold text-navy uppercase mb-2">Internal Notes</h3>
             <p className="text-[14px] text-navy italic">"{app.internalNotes}"</p>
           </div>
          )}

          <EndorsementView application={app} isAdminView={true} />
        </div>

        {/* Right Column - Actions & Audit */}
        <div className="w-full xl:w-1/3 xl:min-w-[350px]">
          <div className="sticky top-24">
            <div className="bg-white border border-border rounded-lg shadow-sm p-6 mb-6">
              <div className="mb-4">
                <span className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-2">Current Status</span>
                <Badge status={app.status} />
              </div>

              <div className="mb-6">
                <span className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1">Expiration</span>
                <div className="text-[14px] text-navy font-semibold">
                  {app.expiresAt ? new Date(app.expiresAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <ActionButtons applicationId={app.id} status={app.status} />
            </div>

            <Card title="Audit Timeline">
              <AuditTimeline logs={app.auditLogs} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
