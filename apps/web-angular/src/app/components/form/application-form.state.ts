import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { FormStore } from '../../core/form/form-store';
import { ToastService } from '../../core/toast.service';
import { applicationsApi } from '../../lib/api/applications.api';
import { LANGUAGES, LANGUAGE_OTHER } from '../../lib/constants/languages';
import { ApplicationData, applicationSchema } from '../../lib/schemas/application.schema';

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
    // A language row with "Other (please specify)": the API stores the typed
    // name as the language. The form-only `languageOther` field is never sent,
    // and neither is "Other" itself (e.g. an autosave before anything is typed).
    if ('languageOther' in data || data.language === LANGUAGE_OTHER) {
      const { languageOther, ...row } = data;
      if (row.language === LANGUAGE_OTHER) {
        const typed = typeof languageOther === 'string' ? languageOther.trim() : '';
        // A UN language typed under Other is saved under its listed spelling.
        row.language = LANGUAGES.find((l) => l.toLowerCase() === typed.toLowerCase()) ?? typed;
      }
      return sanitizeForApi(row);
    }
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

/** Shown when this page's editing link was replaced by a newer one (API 410). */
export const REPLACED_LINK_MESSAGE =
  'This editing link has expired or been replaced by a newer one. Please open the latest link we emailed you, or request one from the Application Status page.';

/** A saved language outside the list loads as "Other (please specify)" with its name filled in. */
function withOtherLanguages(data?: Partial<ApplicationData>): Partial<ApplicationData> | undefined {
  if (!data?.languages) return data;
  return {
    ...data,
    languages: data.languages.map((l) =>
      hasText(l?.language) && !LANGUAGES.includes(l.language)
        ? { ...l, language: LANGUAGE_OTHER, languageOther: l.language }
        : l,
    ),
  };
}

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
  /**
   * Shown when an application is already in progress for the details entered.
   * It is not opened here (that would let anyone who knows someone's email and
   * association take it over); its owner is emailed a link to continue it.
   */
  readonly inProgressNotice = signal(false);

  // useAutoSave
  readonly saveStatus = signal<SaveStatus>('idle');
  readonly lastSavedAt = signal<Date | null>(null);
  private saveTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSave());
  }

  init(initialData?: Partial<ApplicationData>, initialDraftId?: string, isResume?: boolean, initialEditToken?: string) {
    initialData = withOtherLanguages(initialData);
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
    // An error from the step being left no longer applies.
    if (this.toast.toast()?.type === 'error') this.toast.close();
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
        if (error?.response?.status === 410) this.toast.showToast(REPLACED_LINK_MESSAGE, 'error');
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
        if (res.resumed || !res.id || !res.editToken) {
          this.inProgressNotice.set(true);
          this.saveStatus.set('idle');
          return;
        }
        this.draftId.set(res.id!);
        this.editToken.set(res.editToken!);
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
        } else if (error?.response?.status === 429) {
          this.toast.showToast('Too many attempts in a short time. Please wait a minute and try again.', 'error');
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
            if (res.resumed || !res.id || !res.editToken) {
              this.inProgressNotice.set(true);
              this.saveStatus.set('idle');
              return;
            }
            this.draftId.set(res.id!);
            this.editToken.set(res.editToken!);
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
          if (error?.response?.status === 410) {
            this.toast.showToast(REPLACED_LINK_MESSAGE, 'error');
            return;
          }
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
}
