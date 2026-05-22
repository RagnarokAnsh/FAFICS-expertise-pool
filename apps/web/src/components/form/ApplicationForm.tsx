import React, { useState } from 'react';
import { FormProvider, SubmitHandler } from 'react-hook-form';
import { useApplicationForm } from '../../hooks/useApplicationForm';
import { applicationsApi } from '../../lib/api/applications.api';
import { ApplicationData } from '../../lib/schemas/application.schema';
import { FormProgress } from './FormProgress';
import { Step1PersonalInfo } from './steps/Step1PersonalInfo';
import { Step2Education } from './steps/Step2Education';
import { Step3WorkExperience } from './steps/Step3WorkExperience';
import { Step4SelfAssessment } from './steps/Step4SelfAssessment';
import { Step5ConsentSubmit } from './steps/Step5ConsentSubmit';

interface ApplicationFormProps {
  initialData?: Partial<ApplicationData>;
  initialDraftId?: string;
}

export function ApplicationForm({ initialData, initialDraftId }: ApplicationFormProps = {}) {
  const { form, currentStep, draftId, saveStatus, handleNext, handleBack, goToStep } = useApplicationForm(initialData, initialDraftId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const onSubmitForm: SubmitHandler<ApplicationData> = async (data) => {
    setIsSubmitting(true);
    try {
      const consent = { consentData: true, consentAccurate: true };
      if (draftId) {
        // Final save before submission
        await applicationsApi.updateDraft(draftId, data);
        const submitResponse = await applicationsApi.submitApplication(draftId, consent);
        setReferenceNumber(submitResponse.referenceNumber);
        setSubmitSuccess(true);
        localStorage.removeItem('fafics_draft_id');
      } else {
        const createResponse = await applicationsApi.createDraft(data);
        const submitResponse = await applicationsApi.submitApplication(createResponse.id, consent);
        setReferenceNumber(submitResponse.referenceNumber);
        setSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Failed to submit application. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-[700px] mx-auto py-12 px-6">
        <div className="bg-white border border-border rounded-theme p-10 text-center shadow-theme">
          <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-8 h-8">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="font-serif text-[28px] font-bold text-navy mb-4">Application Submitted!</h2>
          <p className="text-[15px] text-text mb-6">
            Thank you for applying to the FAFICS Expertise Pool. Your application has been successfully received.
          </p>
          <div className="bg-navy-light border border-border rounded-lg p-6 mb-8 max-w-[400px] mx-auto">
            <p className="text-[12px] uppercase tracking-wider font-bold text-navy-mid mb-2">Your Reference Number</p>
            <p className="font-mono text-[24px] font-bold text-navy">{referenceNumber}</p>
          </div>
          <p className="text-[14px] text-text-mid mb-8">
            We have sent a confirmation email with these details. Your application has also been forwarded to your Local Association President for endorsement.
          </p>
          <button 
            className="px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors"
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <FormProgress currentStep={currentStep} goToStep={goToStep} />
      
      <main className="max-w-[1020px] mx-auto px-4 md:px-8 py-8 md:py-10">
        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {currentStep === 1 && <Step1PersonalInfo onNext={handleNext} />}
            {currentStep === 2 && <Step2Education onNext={handleNext} onBack={handleBack} />}
            {currentStep === 3 && <Step3WorkExperience onNext={handleNext} onBack={handleBack} />}
            {currentStep === 4 && <Step4SelfAssessment onNext={handleNext} onBack={handleBack} />}
            {currentStep === 5 && (
              <Step5ConsentSubmit 
                onNext={(data) => {
                  form.handleSubmit(onSubmitForm as any)();
                }} 
                onBack={handleBack} 
                goToStep={goToStep}
                isSubmitting={isSubmitting}
              />
            )}
          </form>
        </FormProvider>

        {draftId && saveStatus !== 'idle' && (
          <div className="fixed bottom-6 right-6 bg-navy text-white text-sm px-4 py-2 rounded shadow-lg flex items-center gap-2 z-50 animate-[fadeIn_0.3s_ease]">
            {saveStatus === 'saving' ? (
              <>
                <svg className="animate-spin h-4 w-4 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving draft...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Draft saved
              </>
            ) : (
              <span className="text-danger">Save failed</span>
            )}
          </div>
        )}
      </main>
    </>
  );
}
