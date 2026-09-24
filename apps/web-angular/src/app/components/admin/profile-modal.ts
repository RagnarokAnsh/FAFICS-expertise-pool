import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { adminApi } from '../../lib/api/admin.api';
import { COMMITTEE_OTHER } from '../../lib/constants/work';
import { formatDate } from '../../lib/utils/date';

function initials(first: string, last: string) {
  return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();
}

function dur(years: number | string | null) {
  if (years == null || years === '') return '';
  const n = Number(years);
  if (!Number.isFinite(n)) return '';
  if (n >= 99) return ' · 30+ yrs';
  return ` · ${n} yr${n === 1 ? '' : 's'}`;
}

/** FAFICS "Area of Contribution": drop the "Other" sentinel, append its free text. */
function faficsArea(e: any): string {
  const parts = (e.areaOfContribution || '').split('; ').filter((c: string) => c && c !== COMMITTEE_OTHER);
  if (e.areaOfContributionOther) parts.push(e.areaOfContributionOther);
  return parts.join(', ');
}

const LEVEL_PILL: Record<string, string> = {
  expert: 'bg-[#eeedfe] text-[#534ab7]',
  advanced: 'bg-navy-light text-navy-mid',
  average: 'bg-off-white text-text-muted border border-border',
};

/** components/admin/ProfileModal.tsx */
@Component({
  selector: 'app-profile-modal',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #row let-k="k" let-v="v">
      @if (v) {
        <div class="mb-1.5 flex items-baseline gap-2">
          <span class="w-[78px] shrink-0 text-[11px] text-text-muted">{{ k }}</span>
          <span class="text-[12.5px] font-medium leading-snug text-text">{{ v }}</span>
        </div>
      }
    </ng-template>

    @if (applicationId()) {
      <div
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/60 p-5 backdrop-blur-sm"
        (click)="onBackdrop($event)"
      >
        <div class="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          @if (query.isLoading() || !query.data()) {
            <div class="flex h-64 items-center justify-center text-text-muted">Loading profile…</div>
          } @else {
            @let app = query.data();
            <div class="sticky top-0 z-10 flex items-center gap-3.5 bg-navy px-6 py-5">
              <div
                class="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[3px] border-gold/30 bg-gold font-serif text-[17px] font-bold text-white"
              >
                {{ initials(app.firstName, app.lastName) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-serif text-[19px] font-bold text-white">{{ app.firstName }} {{ app.lastName }}</div>
                <div class="mt-0.5 truncate text-[11.5px] text-white/50">
                  {{ join([app.nationality, app.associationName, app.referenceNumber], ' · ') }}
                </div>
              </div>
              <button
                (click)="closed.emit()"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[18px] text-white transition-colors hover:bg-white/20"
              >
                ×
              </button>
            </div>

            <div class="px-6 py-5">
              <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="rounded-lg border border-border bg-off-white p-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Personal Details</div>
                  <ng-container *ngTemplateOutlet="row; context: { k: 'Gender', v: app.gender }" />
                  <ng-container
                    *ngTemplateOutlet="row; context: { k: 'Nationality', v: join([app.nationality, app.secondNationality], ', ') }"
                  />
                  <ng-container *ngTemplateOutlet="row; context: { k: 'Email', v: app.email }" />
                  <ng-container *ngTemplateOutlet="row; context: { k: 'Phone', v: app.phone }" />
                  <ng-container
                    *ngTemplateOutlet="row; context: { k: 'Separated', v: app.separationDate && formatDate(app.separationDate) }"
                  />
                  <ng-container
                    *ngTemplateOutlet="row; context: { k: 'Association', v: app.associationName + ', ' + app.associationCountry }"
                  />
                </div>
                <div class="rounded-lg border border-border bg-off-white p-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Languages</div>
                  <ul>
                    @for (l of app.languages; track l.id) {
                      <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {{ l.language }} <span class="text-text-muted">({{ proficiencyLabel(l.proficiency) }})</span>
                      </li>
                    }
                  </ul>
                  @if (app.educations?.length > 0) {
                    <div class="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Education</div>
                    <ul>
                      @for (e of app.educations; track e.id) {
                        <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                          {{ e.degreeName }} — {{ e.institution }}
                        </li>
                      }
                    </ul>
                  }
                </div>
              </div>

              @if (app.unExperiences?.length > 0) {
                <div class="rounded-lg border border-border bg-off-white p-4 mb-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">UN Experience</div>
                  <ul>
                    @for (e of app.unExperiences; track e.id) {
                      <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {{ e.agency }} — {{ e.positionTitle }}{{ e.grade ? ', ' + e.grade : '' }}{{ dur(e.durationYears) }}
                      </li>
                    }
                  </ul>
                  @if (app.unExperienceSummary) {
                    <p class="mt-2 text-[12px] italic leading-snug text-text-muted">{{ app.unExperienceSummary }}</p>
                  }
                </div>
              }

              @if (app.nonUnExperiences?.length > 0) {
                <div class="rounded-lg border border-border bg-off-white p-4 mb-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Non-UN Experience</div>
                  <ul>
                    @for (e of app.nonUnExperiences; track e.id) {
                      <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {{ e.organization }} — {{ e.positionTitle
                        }}{{ e.areaOfExpertise ? ', ' + e.areaOfExpertise : '' }}{{ dur(e.durationYears) }}
                      </li>
                    }
                  </ul>
                  @if (app.nonUnExperienceSummary) {
                    <p class="mt-2 text-[12px] italic leading-snug text-text-muted">{{ app.nonUnExperienceSummary }}</p>
                  }
                </div>
              }

              @if (app.faficsExperiences?.length > 0) {
                <div class="rounded-lg border border-border bg-off-white p-4 mb-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">FAFICS Experience</div>
                  <ul>
                    @for (e of app.faficsExperiences; track e.id) {
                      @let area = faficsArea(e);
                      <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {{ e.positionHeld }}{{ area ? ' — ' + area : '' }}{{ dur(e.durationYears) }}
                      </li>
                    }
                  </ul>
                  @if (app.faficsExperienceSummary) {
                    <p class="mt-2 text-[12px] italic leading-snug text-text-muted">{{ app.faficsExperienceSummary }}</p>
                  }
                </div>
              }

              @if (app.localExperiences?.length > 0) {
                <div class="rounded-lg border border-border bg-off-white p-4 mb-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">
                    Local Association Experience
                  </div>
                  <ul>
                    @for (e of app.localExperiences; track e.id) {
                      <li class="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {{ e.positionHeld }}{{ e.areaOfContribution ? ' — ' + e.areaOfContribution : '' }}{{
                          dur(e.durationYears)
                        }}
                      </li>
                    }
                  </ul>
                  @if (app.localExperienceSummary) {
                    <p class="mt-2 text-[12px] italic leading-snug text-text-muted">{{ app.localExperienceSummary }}</p>
                  }
                </div>
              }

              <div class="rounded-lg border border-border bg-off-white p-4">
                <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Self-Assessment</div>
                <div class="flex flex-col gap-1.5">
                  @for (e of ratedExpertise(app); track e.id) {
                    <div class="flex items-center gap-2">
                      <span
                        [class]="'w-4 shrink-0 text-center text-[13px] text-gold ' + (e.isPreferred ? '' : 'invisible')"
                        [attr.title]="e.isPreferred ? 'Preferred area' : null"
                        [attr.aria-hidden]="!e.isPreferred"
                        >★</span
                      >
                      <span class="flex-1 text-[12px] text-text">{{ e.areaLabel }}</span>
                      @if (e.expertiseLevel) {
                        <span
                          [class]="
                            'rounded-[10px] px-2 py-0.5 text-[10px] font-semibold capitalize ' +
                            (levelPill[e.expertiseLevel] || levelPill['average'])
                          "
                          >{{ e.expertiseLevel }}</span
                        >
                      }
                    </div>
                  }
                  @if (ratedExpertise(app).length === 0) {
                    <span class="text-[12px] text-text-muted">No expertise areas rated.</span>
                  }
                </div>
              </div>

              @if (app.competencies?.length > 0) {
                <div class="rounded-lg border border-border bg-off-white p-4 mt-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Core Competencies</div>
                  <div class="flex flex-wrap gap-1.5">
                    @for (c of app.competencies; track c) {
                      <span class="rounded-[10px] bg-gold-light px-2 py-0.5 text-[11px] font-medium text-gold">{{ c }}</span>
                    }
                  </div>
                </div>
              }

              @let committees = committeesFor(app);
              @if (committees.length > 0 || app.positionPreferenceRationale) {
                <div class="rounded-lg border border-border bg-off-white p-4 mt-4">
                  <div class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">
                    Position / Committee Preference
                  </div>
                  @if (committees.length > 0) {
                    <div class="mb-2 flex flex-wrap gap-1.5">
                      @for (c of committees; track c) {
                        <span class="rounded-[10px] bg-navy-light px-2 py-0.5 text-[11px] font-medium text-navy-mid">{{
                          c
                        }}</span>
                      }
                    </div>
                  }
                  @if (app.positionPreferenceRationale) {
                    <p class="text-[12.5px] leading-snug text-text">{{ app.positionPreferenceRationale }}</p>
                  }
                </div>
              }

              @if (app.status === 'approved') {
                <div class="mt-3 rounded-lg border border-[#c0dd97] bg-[#eaf3de] px-3.5 py-2.5 text-[12px] text-success">
                  <strong>✓ Active in Expertise Pool</strong>{{
                    app.approvedAt ? ' — Approved ' + formatDate(app.approvedAt) : ''
                  }}{{ app.expiresAt ? ' · Expires ' + formatDate(app.expiresAt) : '' }}
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ProfileModalComponent {
  readonly applicationId = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly formatDate = formatDate;
  protected readonly initials = initials;
  protected readonly dur = dur;
  protected readonly faficsArea = faficsArea;
  protected readonly levelPill = LEVEL_PILL;

  protected readonly query = injectQuery(() => ({
    queryKey: ['application-detail', this.applicationId()],
    queryFn: () => adminApi.getApplication(this.applicationId() as string),
    enabled: !!this.applicationId(),
  }));

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  protected join(values: unknown[], sep: string): string {
    return values.filter(Boolean).join(sep);
  }

  protected proficiencyLabel(proficiency: unknown): string {
    return String(proficiency).replace('_', ' ');
  }

  protected ratedExpertise(app: any): any[] {
    return (app.expertise ?? []).filter(
      (e: any) => e.expertiseLevel || e.isPreferred || (e.isCustom && e.otherDescription),
    );
  }

  // Drop the "Other" sentinel and show the specified free text instead.
  protected committeesFor(app: any): string[] {
    const committees = (app.preferredCommittees ?? []).filter((c: string) => c !== COMMITTEE_OTHER);
    if (app.preferredCommitteesOther) committees.push(app.preferredCommitteesOther);
    return committees;
  }
}
