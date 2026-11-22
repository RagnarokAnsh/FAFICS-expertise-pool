import React from 'react';
import type { Metadata } from 'next';
import { EndorsementView } from '@/components/endorse/EndorsementView';
import ViewLinkError from './error';

interface PageProps {
  params: { token: string };
}

export const metadata: Metadata = {
  title: 'Your Application — FAFICS Expertise Pool',
  // The URL carries a private link token; keep it out of search engines.
  robots: { index: false, follow: false },
};

async function getApplication(token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const res = await fetch(`${API_URL}/applications/view/${encodeURIComponent(token)}`, {
    // Always show the application as it is now (status can change).
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 410 || res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch application');
  }

  const json = await res.json();
  // Unwrap the { data, meta } envelope from TransformInterceptor
  return json.data ?? json;
}

/** The applicant's read-only view of their submitted application (emailed link). */
export default async function ApplicantViewPage({ params }: PageProps) {
  const application = await getApplication(params.token);

  if (!application) {
    return <ViewLinkError />;
  }

  return (
    <div className="min-h-screen bg-off-white">
      <EndorsementView application={application} isApplicantView />
    </div>
  );
}
