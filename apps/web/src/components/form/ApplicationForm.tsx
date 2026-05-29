"use client";

import React, { useState, useEffect } from 'react';
import { FormProvider, SubmitHandler } from 'react-hook-form';
import { useApplicationForm, sanitizeForApi } from '../../hooks/useApplicationForm';
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
  isResume?: boolean;
  presidentNotes?: string | null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ApplicationForm({ initialData, initialDraftId, isResume, presidentNotes }: ApplicationFormProps = {}) {
  const { form, currentStep, highestStep, draftId, saveStatus, lastSavedAt, draftCreatedEmail, handleNext, handleBack, goToStep } = useApplicationForm(initialData, initialDraftId, isResume);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  /* ── Draft creation toast ── */
  const [showDraftToast, setShowDraftToast] = useState(false);

  useEffect(() => {
    if (draftCreatedEmail) {
      setShowDraftToast(true);
      const t = setTimeout(() => setShowDraftToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, [draftCreatedEmail]);

  const onSubmitForm: SubmitHandler<ApplicationData> = async (data) => {
    setIsSubmitting(true);
    try {
      const consent = { consentData: true, consentAccurate: true };
      if (draftId) {
        // Final save before submission
        await applicationsApi.updateDraft(draftId, sanitizeForApi(data));
        const submitResponse = await applicationsApi.submitApplication(draftId, consent);
        setReferenceNumber(submitResponse.referenceNumber);
        setSubmitSuccess(true);
        if (!isResume) {
          localStorage.removeItem('fafics_draft_id');
        }
      } else {
        const createResponse = await applicationsApi.createDraft(sanitizeForApi(data));
        const submitResponse = await applicationsApi.submitApplication(createResponse.id, consent);
        setReferenceNumber(submitResponse.referenceNumber);
        setSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
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
      <FormProgress currentStep={currentStep} highestStep={highestStep} goToStep={goToStep} />
      
      <main className="max-w-[1020px] mx-auto px-4 md:px-8 py-8 md:py-10">
        {presidentNotes && (
          <div className="mb-8 p-6 bg-[#fff8e6] border border-[#f5d996] rounded-xl shadow-sm">
            <h3 className="font-serif text-[18px] font-bold text-[#8a6819] mb-2 flex items-center gap-2">
              <span className="text-[20px]">💬</span> 
              President&apos;s Feedback
            </h3>
            <p className="text-[15px] text-[#735613] whitespace-pre-wrap leading-relaxed">
              {presidentNotes}
            </p>
          </div>
        )}

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

        {/* ── Draft creation toast (appears once after Step 1 completes) ── */}
        {showDraftToast && draftCreatedEmail && (
          <div
            className="fixed top-6 right-6 z-50 max-w-[380px] animate-[fadeIn_0.3s_ease]"
            style={{ animation: 'fadeIn 0.3s ease, fadeOut 0.5s ease 5.5s forwards' }}
          >
            <div className="bg-white border-l-4 border-[#3B6D11] rounded-lg shadow-lg p-4 flex items-start gap-3">
              <span className="text-[#3B6D11] text-[18px] mt-0.5">✓</span>
              <div>
                <p className="text-[14px] font-semibold text-navy">Progress saved</p>
                <p className="text-[13px] text-text-mid mt-1">
                  A link to resume this application has been sent to <strong>{draftCreatedEmail}</strong>. Check your inbox.
                </p>
              </div>
              <button
                onClick={() => setShowDraftToast(false)}
                className="text-text-muted hover:text-text text-[18px] ml-auto shrink-0 leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ── Persistent auto-save indicator (bottom-right, visible on steps 2–5 when draftId exists) ── */}
        {draftId && currentStep > 1 && (
          <div className="fixed bottom-6 right-6 z-50">
            {saveStatus === 'saving' ? (
              <div className="bg-navy text-white text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
                <svg className="animate-spin h-3.5 w-3.5 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-white/80">Saving...</span>
              </div>
            ) : saveStatus === 'saved' ? (
              <div className="bg-navy text-white text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
                <svg className="w-3.5 h-3.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                ✓ Saved {lastSavedAt ? formatTime(lastSavedAt) : ''}
              </div>
            ) : saveStatus === 'error' ? (
              <div className="bg-white border border-[#f5c6cb] text-[#856404] text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
                <span>⚠</span>
                Save failed — check connection
              </div>
            ) : lastSavedAt ? (
              <div className="bg-white/80 text-text-muted text-[12px] px-3 py-1.5 rounded-lg shadow border border-border">
                ✓ Saved {formatTime(lastSavedAt)}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
