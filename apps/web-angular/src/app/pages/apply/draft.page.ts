import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationFormComponent } from '../../components/form/application-form';
import { applicationsApi } from '../../lib/api/applications.api';

/** app/apply/[draftId]/page.tsx */
@Component({
  selector: 'app-draft-page',
  imports: [ApplicationFormComponent],
  template: `
    @if (error()) {
      <div class="min-h-screen bg-off-white py-12 px-6 flex items-center justify-center">
        <div class="bg-white border border-border rounded-theme p-10 text-center shadow-theme max-w-[500px]">
          <h2 class="font-serif text-[24px] font-bold text-navy mb-4">Cannot Load Draft</h2>
          <p class="text-[15px] text-text mb-6">{{ error() }}</p>
          <button
            class="px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors"
            (click)="startNew()"
          >
            Start New Application
          </button>
        </div>
      </div>
    } @else if (!initialData()) {
      <div class="min-h-screen bg-off-white flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <svg class="animate-spin h-8 w-8 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p class="text-navy-mid font-semibold">Loading your application...</p>
        </div>
      </div>
    } @else {
      <div class="min-h-screen bg-off-white">
        <app-application-form [initialData]="initialData()" [initialDraftId]="draftId" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DraftPage implements OnInit {
  private readonly router = inject(Router);
  protected readonly draftId = inject(ActivatedRoute).snapshot.paramMap.get('draftId') ?? '';
  protected readonly initialData = signal<any>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.draftId) return;
    try {
      const data = await applicationsApi.getDraft(this.draftId);
      this.initialData.set(data);
    } catch (err: any) {
      this.error.set('Draft not found or you do not have permission to access it.');
    }
  }

  protected startNew(): void {
    this.router.navigateByUrl('/');
  }
}
