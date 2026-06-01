import { useState, useEffect, useCallback } from 'react';
import { useForm, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applicationSchema, ApplicationData } from '../lib/schemas/application.schema';
import { useAutoSave } from './useAutoSave';
import { applicationsApi } from '../lib/api/applications.api';

/**
 * Sanitize form data before sending to the backend.
 * - Strips empty strings (optional fields should be undefined, not "")
 * - Converts NaN to undefined (from valueAsNumber on empty selects)
 * - Removes undefined values from arrays
 */
export function sanitizeForApi(data: any): any {
  if (data === null || data === undefined) return undefined;
  if (typeof data === 'number') return isNaN(data) ? undefined : data;
  if (typeof data === 'string') return data.trim() === '' ? undefined : data;
  if (Array.isArray(data)) {
    return data
      .map(sanitizeForApi)
      .filter((item) => item !== undefined && item !== null);
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Don't send metadata or consent fields during draft updates
      if (['consentData', 'consentAccurate', 'id', 'status', 'presidentNotes', 'applicationId', 'createdAt', 'updatedAt', 'userId'].includes(key)) continue;
      
      const sanitized = sanitizeForApi(value);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  return data;
}

/**
 * Extract only Step 1 data (personal + association) for the initial createDraft call.
 * The backend CreateDraftDto only accepts these two nested objects.
 */
function extractStep1Data(data: any): { personal: any; association: any } {
  return {
    personal: sanitizeForApi(data.personal) || {},
    association: sanitizeForApi(data.association) || {},
  };
}

function computeInitialStep(data?: Partial<ApplicationData>): number {
  if (!data) return 1;
  
  let step = 1;
  if (data.personal?.firstName && data.association?.associationName) {
    step = 2;
  }
  if (step === 2 && data.educations && data.educations.length > 0 && data.languages && data.languages.length > 0) {
    step = 3;
  }
  if (step === 3 && data.unExperiences && data.unExperiences.length > 0) {
    step = 4;
  }
  if (step === 4 && data.expertise && data.expertise.length > 0) {
    step = 5;
  }
  
  return step;
}

export function useApplicationForm(initialData?: Partial<ApplicationData>, initialDraftId?: string, isResume?: boolean) {
  const [currentStep, setCurrentStep] = useState(computeInitialStep(initialData));
  const [highestStep, setHighestStep] = useState(currentStep);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [draftCreatedEmail, setDraftCreatedEmail] = useState<string | null>(null);

  const form = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema as any) as any,
    defaultValues: initialData as DefaultValues<ApplicationData>,
    mode: 'onChange',
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData as DefaultValues<ApplicationData>);
    }
  }, [initialData, form]);

  useEffect(() => {
    if (currentStep > highestStep) {
      setHighestStep(currentStep);
    }
  }, [currentStep, highestStep]);

  const { saveStatus, triggerSave, setSaveStatus, cancelSave, lastSavedAt, setLastSavedAt } = useAutoSave(draftId);

  // Load from local storage if no initial draft ID was provided
  useEffect(() => {
    if (!initialDraftId && !isResume && typeof window !== 'undefined') {
      const savedDraftId = localStorage.getItem('fafics_draft_id');
      if (savedDraftId) {
        setDraftId(savedDraftId);
      }
    }
  }, [initialDraftId]);

  // Handle draft ID updates
  useEffect(() => {
    if (draftId && !isResume && typeof window !== 'undefined') {
      localStorage.setItem('fafics_draft_id', draftId);
    }
  }, [draftId]);

  // Watch for changes to trigger auto-save (debounced)
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (draftId) {
        triggerSave(sanitizeForApi(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, draftId, triggerSave]);

  const handleNext = useCallback(async (stepData?: any) => {
    const currentValues = form.getValues();
    const updatedData = stepData ? { ...currentValues, ...stepData } : currentValues;
    
    // Create draft on first step completion if no draftId
    if (currentStep === 1 && !draftId) {
      cancelSave();
      setSaveStatus('saving');
      try {
        // Only send Step 1 data (personal + association) for draft creation
        const step1Data = extractStep1Data(updatedData);
        const res = await applicationsApi.createDraft(step1Data);
        setDraftId(res.id);
        setDraftCreatedEmail(step1Data.personal?.email || null);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Failed to create draft:', error);
        alert('Failed to save draft. Please check your connection and try again.');
        setSaveStatus('error');
        return;
      }
    } else if (draftId) {
      // Force an immediate save when navigating steps
      cancelSave();
      setSaveStatus('saving');
      try {
        await applicationsApi.updateDraft(draftId, sanitizeForApi(updatedData));
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Failed to save draft:', error);
        setSaveStatus('error');
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep, draftId, form, setSaveStatus, cancelSave, triggerSave]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step <= highestStep && step !== currentStep) {
      setCurrentStep(step);
      window.scrollTo(0, 0);
    }
  }, [currentStep, highestStep]);

  return {
    form,
    currentStep,
    highestStep,
    draftId,
    saveStatus,
    lastSavedAt,
    draftCreatedEmail,
    handleNext,
    handleBack,
    goToStep,
  };
}
