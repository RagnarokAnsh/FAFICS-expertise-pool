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
function sanitizeForApi(data: any): any {
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
      // Don't send consent fields during draft updates
      if (key === 'consentData' || key === 'consentAccurate') continue;
      
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

export function useApplicationForm(initialData?: Partial<ApplicationData>, initialDraftId?: string) {
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);

  const form = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema as any) as any,
    defaultValues: initialData as DefaultValues<ApplicationData>,
    mode: 'onChange',
  });

  const { saveStatus, triggerSave, setSaveStatus, cancelSave } = useAutoSave(draftId);

  // Load from local storage if no initial draft ID was provided
  useEffect(() => {
    if (!initialDraftId && typeof window !== 'undefined') {
      const savedDraftId = localStorage.getItem('fafics_draft_id');
      if (savedDraftId) {
        setDraftId(savedDraftId);
      }
    }
  }, [initialDraftId]);

  // Handle draft ID updates
  useEffect(() => {
    if (draftId && typeof window !== 'undefined') {
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
        setSaveStatus('saved');
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
  }, [currentStep, draftId, form, setSaveStatus]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  return {
    form,
    currentStep,
    draftId,
    saveStatus,
    handleNext,
    handleBack,
    goToStep,
  };
}
