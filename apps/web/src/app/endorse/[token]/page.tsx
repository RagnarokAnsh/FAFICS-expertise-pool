import React from 'react';
import { notFound } from 'next/navigation';
import { EndorsementView } from '@/components/endorse/EndorsementView';
import TokenError from './error';

interface PageProps {
  params: { token: string };
}

async function getApplication(token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const res = await fetch(`${API_URL}/endorse/${token}`, {
    // We don't want to cache this as it might be used/expired
    cache: 'no-store'
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 410 || res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch endorsement data');
  }

  const json = await res.json();
  // Unwrap the { data, meta } envelope from TransformInterceptor
  return json.data ?? json;
}

export default async function EndorsePage({ params }: PageProps) {
  const application = await getApplication(params.token);

  if (!application) {
    return <TokenError />;
  }

  return (
    <div className="min-h-screen bg-off-white">
      <EndorsementView application={application} token={params.token} />
    </div>
  );
}
