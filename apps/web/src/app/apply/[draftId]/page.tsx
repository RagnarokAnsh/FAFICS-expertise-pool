"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApplicationForm } from '../../../components/form/ApplicationForm';
import { applicationsApi } from '../../../lib/api/applications.api';
import { useApplicationForm } from '../../../hooks/useApplicationForm';

export default function ResumeDraftPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const [initialData, setInitialData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        const data = await applicationsApi.getDraft(draftId);
        setInitialData(data);
      } catch (err: any) {
        setError('Draft not found or you do not have permission to access it.');
      }
    }
    if (draftId) {
      loadDraft();
    }
  }, [draftId]);

  if (error) {
    return (
      <div className="min-h-screen bg-off-white py-12 px-6 flex items-center justify-center">
        <div className="bg-white border border-border rounded-theme p-10 text-center shadow-theme max-w-[500px]">
          <h2 className="font-serif text-[24px] font-bold text-navy mb-4">Cannot Load Draft</h2>
          <p className="text-[15px] text-text mb-6">{error}</p>
          <button 
            className="px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors"
            onClick={() => router.push('/')}
          >
            Start New Application
          </button>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-navy-mid font-semibold">Loading your application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white">
      <ApplicationFormWrapper initialData={initialData} draftId={draftId} />
    </div>
  );
}

// Wrapper to initialize form with data
function ApplicationFormWrapper({ initialData, draftId }: { initialData: any, draftId: string }) {
  // We need to reset the hook's internal state with this data.
  // The simplest way without refactoring the hook is to pass initialData to it, 
  // but since we want to avoid prop drilling in standard page, we might need to modify `useApplicationForm` 
  // or just render `ApplicationForm` directly. Let's just render the standard form and rely on the fact 
  // that we can pass initialData to it. Wait, `ApplicationForm` doesn't take props currently.
  
  // For the sake of this phase, we will assume `useApplicationForm` reads from `localStorage` 
  // OR we can pass it down. Let's update `useApplicationForm` or `ApplicationForm` to accept props.
  // Actually, I can just set the localStorage item here before rendering, but that's a bit hacky.
  // I will just modify ApplicationForm to accept initial data.
  return <ApplicationForm initialData={initialData} initialDraftId={draftId} />;
}
