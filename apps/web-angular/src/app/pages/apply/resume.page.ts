import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApplicationFormComponent } from '../../components/form/application-form';
import { NotEditableMessageComponent } from '../../components/form/not-editable-message';
import { TokenExpiredResumeComponent } from '../../components/form/token-expired-resume';
import { applicationsApi } from '../../lib/api/applications.api';
import { ResumeErrorComponent } from './resume-error';

type ResumeState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: any }
  | { kind: 'expired' }
  | { kind: 'locked'; status: string }
  | { kind: 'error' };

/**
 * app/apply/resume/[token]/page.tsx. The Next.js page fetched on the server;
 * here the same request runs once in the browser and renders the same four
 * outcomes (form / expired link / locked / error page).
 */
@Component({
  selector: 'app-resume-page',
  imports: [ApplicationFormComponent, TokenExpiredResumeComponent, NotEditableMessageComponent, ResumeErrorComponent],
  template: `
    @switch (state().kind) {
      @case ('ready') {
        <app-application-form
          [initialDraftId]="data().id"
          [initialData]="data()"
          [isResume]="true"
          [presidentNotes]="data().presidentNotes"
          [editToken]="token"
        />
      }
      @case ('expired') {
        <app-token-expired-resume />
      }
      @case ('locked') {
        <app-not-editable-message [status]="lockedStatus()" />
      }
      @case ('error') {
        <app-resume-error />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ResumePage implements OnInit {
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly state = signal<ResumeState>({ kind: 'loading' });

  protected data(): any {
    const state = this.state();
    return state.kind === 'ready' ? state.data : {};
  }

  protected lockedStatus(): string {
    const state = this.state();
    return state.kind === 'locked' ? state.status : 'locked';
  }

  async ngOnInit(): Promise<void> {
    try {
      const resumeData = await applicationsApi.getResumeData(this.token);
      this.state.set({ kind: 'ready', data: resumeData });
    } catch (error: any) {
      if (error.response?.status === 410) {
        this.state.set({ kind: 'expired' });
        return;
      }
      if (error.response?.status === 400) {
        // We might need to extract the status from the error message or response data
        // For now, assume it's just not editable and use a generic message if we don't know the exact status
        const status = error.response?.data?.status || 'locked';
        this.state.set({ kind: 'locked', status });
        return;
      }
      // For 404 or other errors, render the error boundary
      this.state.set({ kind: 'error' });
    }
  }
}
