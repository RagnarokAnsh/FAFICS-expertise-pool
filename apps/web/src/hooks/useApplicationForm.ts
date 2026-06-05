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

export function useApplicationForm(initialData?: Partial<ApplicationData>, initialDraftId?: string, isResume?: boolean, initialEditToken?: string) {
  const [currentStep, setCurrentStep] = useState(computeInitialStep(initialData));
  const [highestStep, setHighestStep] = useState(currentStep);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [editToken, setEditToken] = useState<string | null>(initialEditToken || null);
  const [draftCreatedEmail, setDraftCreatedEmail] = useState<string | null>(null);
  // When an in-progress application is detected (cached locally, or matched by
  // email + association on the server), we surface a Resume / Start-over choice
  // instead of silently continuing. `fromStep1` = the user had just filled Step 1.
  const [resumePrompt, setResumePrompt] = useState<{ id: string; editToken: string; fromStep1: boolean } | null>(null);

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

  // Forget the locally-cached draft (state + storage). Used when the cached
  // draft turns out to be stale/unauthorized so the form starts fresh.
  const clearLocalDraft = useCallback(() => {
    setDraftId(null);
    setEditToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fafics_draft_id');
      localStorage.removeItem('fafics_draft_token');
    }
  }, []);

  const { saveStatus, triggerSave, setSaveStatus, cancelSave, lastSavedAt, setLastSavedAt } = useAutoSave(draftId, editToken, clearLocalDraft);

  // A fresh tab starts blank. We intentionally do NOT resume from a locally
  // cached draft on load — the Resume / Start-over prompt is driven solely by the
  // server's email + association dedup when Step 1 is submitted. Clear any draft
  // pointer left over from older sessions so it can't trigger stale behavior.
  useEffect(() => {
    if (!initialDraftId && !isResume && typeof window !== 'undefined') {
      localStorage.removeItem('fafics_draft_id');
      localStorage.removeItem('fafics_draft_token');
    }
  }, [initialDraftId]);

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
        if (res.resumed) {
          // An application for this individual + association already exists and is
          // still editable — let the user choose to resume it (loads saved data)
          // or start over (resets the same record). No duplicate is ever created.
          setResumePrompt({ id: res.id, editToken: res.editToken, fromStep1: true });
          setSaveStatus('idle');
          return;
        }
        setDraftId(res.id);
        setEditToken(res.editToken);
        setDraftCreatedEmail(step1Data.personal?.email || null);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
        console.error('Failed to create draft:', error);
        setSaveStatus('error');
        if (error?.response?.status === 409) {
          // Active (submitted/approved) application already exists for this
          // individual + association — can't start another.
          alert(
            error.response?.data?.message ||
              'You already have an application for this association. Please track or edit it from the status page.',
          );
        } else {
          alert('Failed to save draft. Please check your connection and try again.');
        }
        return;
      }
    } else if (draftId) {
      // Force an immediate save when navigating steps
      cancelSave();
      setSaveStatus('saving');
      try {
        await applicationsApi.updateDraft(draftId, sanitizeForApi(updatedData), editToken);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
        // A stale/unauthorized local draft (e.g. it was deleted server-side, or
        // the token is no longer valid) → forget it and create a fresh one so
        // the user isn't stuck on a dead draft.
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          clearLocalDraft();
          try {
            const res = await applicationsApi.createDraft(extractStep1Data(updatedData));
            if (res.resumed) {
              if (typeof window !== 'undefined') {
                window.location.href = `/apply/resume/${res.editToken}`;
              }
              return;
            }
            setDraftId(res.id);
            setEditToken(res.editToken);
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            setTimeout(() => setSaveStatus('idle'), 3000);
          } catch (err2: any) {
            console.error('Failed to recreate draft:', err2);
            setSaveStatus('error');
            if (err2?.response?.status === 409) {
              alert(
                err2.response?.data?.message ||
                  'You already have an application for this association. Please track or edit it from the status page.',
              );
            }
            return;
          }
        } else {
          console.error('Failed to save draft:', error);
          setSaveStatus('error');
        }
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep, draftId, editToken, form, setSaveStatus, cancelSave, triggerSave, clearLocalDraft]);

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

  // Resume the detected in-progress application — loads its saved data via the
  // token-based resume page.
  const resumeExisting = useCallback(() => {
    if (resumePrompt && typeof window !== 'undefined') {
      window.location.href = `/apply/resume/${resumePrompt.editToken}`;
    }
  }, [resumePrompt]);

  // Start over: keep the SAME record (no duplicate) but wipe its saved content so
  // the applicant can refill from scratch.
  const startOver = useCallback(async () => {
    if (!resumePrompt) return;
    const { id, editToken: tok, fromStep1 } = resumePrompt;
    setResumePrompt(null);
    setSaveStatus('saving');
    try {
      await applicationsApi.updateDraft(
        id,
        {
          educations: [],
          languages: [],
          unExperiences: [],
          nonUnExperiences: [],
          faficsExperiences: [],
          localExperiences: [],
          expertise: [],
        },
        tok,
      );
      setDraftId(id);
      setEditToken(tok);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (fromStep1) {
        setCurrentStep(2);
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      // Cached draft is gone/unauthorized — discard it and start completely fresh.
      clearLocalDraft();
      setSaveStatus('idle');
    }
  }, [resumePrompt, clearLocalDraft, setSaveStatus, setLastSavedAt]);

  return {
    form,
    currentStep,
    highestStep,
    draftId,
    editToken,
    saveStatus,
    lastSavedAt,
    draftCreatedEmail,
    resumePrompt,
    resumeExisting,
    startOver,
    handleNext,
    handleBack,
    goToStep,
  };
}
