import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '../../ui/Button';
import { ApplicationData } from '../../../lib/schemas/application.schema';
import { Card } from '../../ui/Card';

interface StepProps {
  onNext: (data: Partial<ApplicationData>) => void;
  onBack: () => void;
  goToStep: (step: number) => void;
  isSubmitting?: boolean;
}

export function Step5ConsentSubmit({ onNext, onBack, goToStep, isSubmitting }: StepProps) {
  const { register, getValues, formState: { errors }, trigger } = useFormContext<ApplicationData>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values = getValues();

  const handleNext = async () => {
    setSubmitError(null);
    const isValid = await trigger(['consentData', 'consentAccurate']);
    if (isValid) {
      onNext({ consentData: true, consentAccurate: true });
    } else {
      setSubmitError('Please check all consent boxes before submitting.');
    }
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="mb-7">
        <h2 className="font-serif text-[22px] font-bold text-navy mb-1">Consent & Submit</h2>
        <p className="text-[13.5px] text-text-mid leading-relaxed">
          Please review your information, read the data protection notice, and submit your application.
        </p>
      </div>

      <Card title="Review Summary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-off-white border border-border rounded-lg px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
              <span>Personal Info</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Name:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.personal?.firstName} {values.personal?.lastName}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Email:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.personal?.email}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Association:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.association?.associationName}</span>
              </div>
            </div>
            <button type="button" className="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans" onClick={() => goToStep(1)}>
              Edit Section
            </button>
          </div>

          <div className="bg-off-white border border-border rounded-lg px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
              <span>Education & Languages</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Degrees:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.educations?.length || 0}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Languages:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.languages?.length || 0}</span>
              </div>
            </div>
            <button type="button" className="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans" onClick={() => goToStep(2)}>
              Edit Section
            </button>
          </div>

          <div className="bg-off-white border border-border rounded-lg px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
              <span>Experience</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">UN:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">{values.unExperiences?.length || 0} roles</span>
              </div>
            </div>
            <button type="button" className="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans" onClick={() => goToStep(3)}>
              Edit Section
            </button>
          </div>

          <div className="bg-off-white border border-border rounded-lg px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
              <span>Expertise</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-baseline">
                <span className="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Preferred:</span>
                <span className="text-[12.5px] text-text font-medium leading-[1.4]">
                  {values.expertise?.filter(e => e.isPreferred).length || 0} areas
                </span>
              </div>
            </div>
            <button type="button" className="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans" onClick={() => goToStep(4)}>
              Edit Section
            </button>
          </div>
        </div>
      </Card>

      <div className="bg-gold-light border-[1.5px] border-gold rounded-theme px-[22px] py-5 mb-5">
        <p className="text-[13.5px] text-text leading-[1.75] mb-3.5">
          By submitting this application, you confirm that you are a member in good standing of the Association listed in Step 1. Your data will be stored securely and will only be accessible to FAFICS Officers and your Association President for the purposes of the Expertise Pool. FAFICS will not share your data with third parties.
        </p>
        <div className="flex items-start gap-3 mb-2.5">
          <input type="checkbox" id="consent_data" className="w-5 h-5 shrink-0 mt-[2px] accent-navy cursor-pointer" {...register('consentData')} />
          <label htmlFor="consent_data" className="text-[14px] font-medium text-navy cursor-pointer leading-[1.5]">
            I consent to FAFICS storing and processing my personal data.
          </label>
        </div>
        <div className="flex items-start gap-3">
          <input type="checkbox" id="consent_accurate" className="w-5 h-5 shrink-0 mt-[2px] accent-navy cursor-pointer" {...register('consentAccurate')} />
          <label htmlFor="consent_accurate" className="text-[14px] font-medium text-navy cursor-pointer leading-[1.5]">
            I confirm that the information provided is accurate and complete.
          </label>
        </div>
        {submitError && (
          <p className="text-danger text-sm mt-3">{submitError}</p>
        )}
      </div>

      <div className="mb-5">
        <h3 className="text-[14px] font-bold text-navy mb-3">What happens next?</h3>
        <div className="flex flex-col">
          <div className="flex items-start gap-3.5 py-3 px-1">
            <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-[#dceeff] text-[#185FA5] border-[1.5px] border-[#b5d4f4]">
              1
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">Application Submitted</div>
              <div className="text-[12.5px] text-text-mid leading-[1.6]">You will receive an email confirmation with a tracking reference number.</div>
            </div>
          </div>
          <div className="w-[2px] h-[18px] bg-border ml-[19px]"></div>
          
          <div className="flex items-start gap-3.5 py-3 px-1">
            <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-gold-light text-[#85500b] border-[1.5px] border-[#fac775]">
              2
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">President Endorsement</div>
              <div className="text-[12.5px] text-text-mid leading-[1.6]">Your Local Association President will receive a secure link to endorse your application.</div>
            </div>
          </div>
          <div className="w-[2px] h-[18px] bg-border ml-[19px]"></div>

          <div className="flex items-start gap-3.5 py-3 px-1">
            <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-[#EEEDFE] text-[#534AB7] border-[1.5px] border-[#AFA9EC]">
              3
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">FAFICS Review</div>
              <div className="text-[12.5px] text-text-mid leading-[1.6]">The FAFICS Secretariat and Succession Planning Committee will review your profile.</div>
            </div>
          </div>
          <div className="w-[2px] h-[18px] bg-border ml-[19px]"></div>

          <div className="flex items-start gap-3.5 py-3 px-1">
            <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-[#EAF3DE] text-[#3B6D11] border-[1.5px] border-[#C0DD97]">
              4
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">Approval & Inclusion</div>
              <div className="text-[12.5px] text-text-mid leading-[1.6]">Upon approval, your profile is added to the Expertise Pool for 3 years.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3.5 items-start bg-navy-light border border-border border-l-[3px] border-l-navy rounded-lg py-4 px-[18px] mb-5">
        <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-navy mb-1">Audit Trail & Data Security</div>
          <div className="text-[12.5px] text-text-mid leading-[1.65]">
            All actions taken on your application (endorsements, reviews, status changes) are securely logged in our immutable audit trail.
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-border mt-2">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Button>
        <Button variant="submit" onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
          {!isSubmitting && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
        </Button>
      </div>
    </div>
  );
}
