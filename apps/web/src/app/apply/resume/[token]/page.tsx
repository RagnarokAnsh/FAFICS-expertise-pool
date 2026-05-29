import React from 'react';
import { ApplicationForm } from '../../../../components/form/ApplicationForm';
import { TokenExpiredResume } from '../../../../components/form/TokenExpiredResume';
import { NotEditableMessage } from '../../../../components/form/NotEditableMessage';
import { applicationsApi } from '../../../../lib/api/applications.api';

export const dynamic = 'force-dynamic';

export default async function ResumePage({ params }: { params: { token: string } }) {
  try {
    const resumeData = await applicationsApi.getResumeData(params.token);
    
    return (
      <ApplicationForm 
        initialDraftId={resumeData.id}
        initialData={resumeData}
        isResume={true}
        presidentNotes={resumeData.presidentNotes}
      />
    );
  } catch (error: any) {
    if (error.response?.status === 410) {
      return <TokenExpiredResume />;
    }
    if (error.response?.status === 400) {
      // We might need to extract the status from the error message or response data
      // For now, assume it's just not editable and use a generic message if we don't know the exact status
      const status = error.response?.data?.status || 'locked';
      return <NotEditableMessage status={status} />;
    }
    
    // For 404 or other errors, render the error boundary
    throw error;
  }
}
