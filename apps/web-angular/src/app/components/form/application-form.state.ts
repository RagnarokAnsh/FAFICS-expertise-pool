import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { FormStore } from '../../core/form/form-store';
import { ToastService } from '../../core/toast.service';
import { applicationsApi } from '../../lib/api/applications.api';
import { ApplicationData, applicationSchema } from '../../lib/schemas/application.schema';
import { withBasePath } from '../../lib/utils/base-path';

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
    return data.map(sanitizeForApi).filter((item) => item !== undefined && item !== null);
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Don't send metadata or consent fields during draft updates
      if (
        [
          'consentData',
          'consentAccurate',
          'id',
          'status',
          'presidentNotes',
          'applicationId',
          'createdAt',
          'updatedAt',
          'userId',
        ].includes(key)
      )
        continue;

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

const hasText = (v?: string | null): boolean => !!v && v.trim() !== '';

/**
 * Resume at the first step that still needs input. Steps 2–4 auto-append empty
 * rows on mount and the auto-save persists them (as `{ sortOrder }` husks), so a
 * step only counts as filled when at least one of its rows has real content —
 * otherwise a draft that completed just Step 1 would resume at Step 3+ and let
 * the applicant skip validation for the steps in between.
 */
function computeInitialStep(data?: Partial<ApplicationData>): number {
  if (!data) return 1;

  let step = 1;
  if (hasText(data.personal?.firstName) && hasText(data.association?.associationName)) {
    step = 2;
  }
  const step2Filled =
    (data.educations ?? []).some((e) => hasText(e?.degreeName) && hasText(e?.institution)) &&
    (data.languages ?? []).some((l) => hasText(l?.language));
  if (step === 2 && step2Filled) {
    step = 3;
  }
  const step3Filled = (data.unExperiences ?? []).some((e) => hasText(e?.agency) && hasText(e?.positionTitle));
  if (step === 3 && step3Filled) {
    step = 4;
  }
  const step4Filled = (data.expertise ?? []).some((e) => !!e?.expertiseLevel || !!e?.isPreferred);
  if (step === 4 && step4Filled) {
    step = 5;
  }

  return step;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * State and actions for the multi-step application form — the Angular port of
 * hooks/useApplicationForm.ts and hooks/useAutoSave.ts. Provided by
 * ApplicationFormComponent alongside the FormStore.
 */
@Injectable()
export class ApplicationFormState {
  readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);

  readonly currentStep = signal(1);
  readonly highestStep = signal(1);
  readonly draftId = signal<string | null>(null);
  readonly editToken = signal<string | null>(null);
  readonly draftCreatedEmail = signal<string | null>(null);
  // When an in-progress application is detected (cached locally, or matched by
  // email + association on the server), we surface a Resume / Start-over choice
  // instead of silently continuing. `fromStep1` = the user had just filled Step 1.
  readonly resumePrompt = signal<{ id: string; editToken: string; fromStep1: boolean } | null>(null);

  // useAutoSave
  readonly saveStatus = signal<SaveStatus>('idle');
  readonly lastSavedAt = signal<Date | null>(null);
  private saveTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSave());
  }

  init(initialData?: Partial<ApplicationData>, initialDraftId?: string, isResume?: boolean, initialEditToken?: string) {
    this.form.init(applicationSchema, initialData, { reset: !!initialData });
    const step = computeInitialStep(initialData);
    this.currentStep.set(step);
    this.highestStep.set(step);
    this.draftId.set(initialDraftId || null);
    this.editToken.set(initialEditToken || null);

    // A fresh tab starts blank. We intentionally do NOT resume from a locally
    // cached draft on load — the Resume / Start-over prompt is driven solely by the
    // server's email + association dedup when Step 1 is submitted. Clear any draft
    // pointer left over from older sessions so it can't trigger stale behavior.
    if (!initialDraftId && !isResume) {
      localStorage.removeItem('fafics_draft_id');
      localStorage.removeItem('fafics_draft_token');
    }

    // Watch for changes to trigger auto-save (debounced)
    this.form.watch((value) => {
      if (this.draftId()) {
        this.triggerSave(sanitizeForApi(value));
      }
    });
  }

  private setStep(step: number): void {
    this.currentStep.set(step);
    if (step > this.highestStep()) {
      this.highestStep.set(step);
    }
  }

  // ── useAutoSave ──────────────────────────────────────────────────────────

  private triggerSave(data: any): void {
    const draftId = this.draftId();
    const editToken = this.editToken();
    // Without a draft id AND token we can't authorize a save — skip rather than
    // firing a request that would 401.
    if (!draftId || !editToken) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      this.saveStatus.set('saving');
      try {
        await applicationsApi.updateDraft(draftId, data, editToken);
        this.saveStatus.set('saved');
        this.lastSavedAt.set(new Date());
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      } catch (error: any) {
        console.error('Failed to auto-save:', error);
        this.saveStatus.set('error');
        // Stale/unauthorized draft → let the owner forget it so the next step
        // creates a fresh one instead of looping on a dead draft.
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          this.clearLocalDraft();
        }
      }
    }, 30000); // 30 seconds of inactivity
  }

  private cancelSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }

  // Forget the locally-cached draft (state + storage). Used when the cached
  // draft turns out to be stale/unauthorized so the form starts fresh.
  private clearLocalDraft(): void {
    this.draftId.set(null);
    this.editToken.set(null);
    localStorage.removeItem('fafics_draft_id');
    localStorage.removeItem('fafics_draft_token');
  }

  // ── useApplicationForm actions ──────────────────────────────────────────

  async handleNext(stepData?: any): Promise<void> {
    const currentValues = this.form.getValues();
    const updatedData = stepData ? { ...currentValues, ...stepData } : currentValues;
    const currentStep = this.currentStep();
    const draftId = this.draftId();

    // Create draft on first step completion if no draftId
    if (currentStep === 1 && !draftId) {
      this.cancelSave();
      this.saveStatus.set('saving');
      try {
        // Only send Step 1 data (personal + association) for draft creation
        const step1Data = extractStep1Data(updatedData);
        const res = await applicationsApi.createDraft(step1Data);
        if (res.resumed) {
          // An application for this individual + association already exists and is
          // still editable — let the user choose to resume it (loads saved data)
          // or start over (resets the same record). No duplicate is ever created.
          this.resumePrompt.set({ id: res.id, editToken: res.editToken, fromStep1: true });
          this.saveStatus.set('idle');
          return;
        }
        this.draftId.set(res.id);
        this.editToken.set(res.editToken);
        this.draftCreatedEmail.set(step1Data.personal?.email || null);
        this.saveStatus.set('saved');
        this.lastSavedAt.set(new Date());
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      } catch (error: any) {
        console.error('Failed to create draft:', error);
        this.saveStatus.set('error');
        if (error?.response?.status === 409) {
          // Active (submitted/approved) application already exists for this
          // individual + association — can't start another.
          this.toast.showToast(
            error.response?.data?.message ||
              'You already have an application for this association. Please track or edit it from the status page.',
            'error',
          );
        } else {
          this.toast.showToast('Failed to save draft. Please check your connection and try again.', 'error');
        }
        return;
      }
    } else if (draftId) {
      // Force an immediate save when navigating steps
      this.cancelSave();
      this.saveStatus.set('saving');
      try {
        await applicationsApi.updateDraft(draftId, sanitizeForApi(updatedData), this.editToken());
        this.saveStatus.set('saved');
        this.lastSavedAt.set(new Date());
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      } catch (error: any) {
        // A stale/unauthorized local draft (e.g. it was deleted server-side, or
        // the token is no longer valid) → forget it and create a fresh one so
        // the user isn't stuck on a dead draft.
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          this.clearLocalDraft();
          try {
            const res = await applicationsApi.createDraft(extractStep1Data(updatedData));
            if (res.resumed) {
              window.location.href = withBasePath(`/apply/resume/${res.editToken}`);
              return;
            }
            this.draftId.set(res.id);
            this.editToken.set(res.editToken);
            this.saveStatus.set('saved');
            this.lastSavedAt.set(new Date());
            setTimeout(() => this.saveStatus.set('idle'), 3000);
          } catch (err2: any) {
            console.error('Failed to recreate draft:', err2);
            this.saveStatus.set('error');
            if (err2?.response?.status === 409) {
              this.toast.showToast(
                err2.response?.data?.message ||
                  'You already have an application for this association. Please track or edit it from the status page.',
                'error',
              );
            }
            return;
          }
        } else {
          console.error('Failed to save draft:', error);
          this.saveStatus.set('error');
        }
      }
    }

    if (this.currentStep() < 5) {
      this.setStep(this.currentStep() + 1);
      window.scrollTo(0, 0);
    }
  }

  handleBack(): void {
    if (this.currentStep() > 1) {
      this.setStep(this.currentStep() - 1);
      window.scrollTo(0, 0);
    }
  }

  goToStep(step: number): void {
    if (step <= this.highestStep() && step !== this.currentStep()) {
      this.setStep(step);
      window.scrollTo(0, 0);
    }
  }

  // Resume the detected in-progress application — loads its saved data via the
  // token-based resume page.
  resumeExisting(): void {
    const prompt = this.resumePrompt();
    if (prompt) {
      window.location.href = withBasePath(`/apply/resume/${prompt.editToken}`);
    }
  }

  // Start over: keep the SAME record (no duplicate) but wipe its saved content so
  // the applicant can refill from scratch.
  async startOver(): Promise<void> {
    const prompt = this.resumePrompt();
    if (!prompt) return;
    const { id, editToken: tok, fromStep1 } = prompt;
    this.resumePrompt.set(null);
    this.saveStatus.set('saving');
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
      this.draftId.set(id);
      this.editToken.set(tok);
      this.saveStatus.set('saved');
      this.lastSavedAt.set(new Date());
      setTimeout(() => this.saveStatus.set('idle'), 3000);
      if (fromStep1) {
        this.setStep(2);
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      // Cached draft is gone/unauthorized — discard it and start completely fresh.
      this.clearLocalDraft();
      this.saveStatus.set('idle');
    }
  }
}
