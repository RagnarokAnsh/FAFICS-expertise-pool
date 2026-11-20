import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { durationLabel } from '../../lib/constants/work';
import {
  contributionParts,
  preferredCommittees,
  ratedExpertise,
  visibleEducations,
  visibleFaficsExperiences,
  visibleLanguages,
  visibleLocalExperiences,
  visibleNonUnExperiences,
  visibleUnExperiences,
} from '../../lib/utils/application-view';
import { formatDate } from '../../lib/utils/date';
import { CardComponent } from '../ui/card';
import { EndorseActionsComponent } from './endorse-actions';

/** components/endorse/EndorsementView.tsx */
@Component({
  selector: 'app-endorsement-view',
  imports: [NgTemplateOutlet, CardComponent, EndorseActionsComponent],
  template: `
    <ng-template #field let-label="label" let-value="value">
      <div class="mb-4 min-w-0">
        <div class="text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1">{{ label }}</div>
        <!-- Long unbroken values (emails) must wrap, not clip at the card edge. -->
        <div class="text-[14px] text-navy font-medium break-words [overflow-wrap:anywhere]">{{ value || '-' }}</div>
      </div>
    </ng-template>

    <div [class]="isAdminView() ? '' : 'max-w-[1020px] mx-auto px-4 md:px-8 py-8'">
      @if (!isAdminView()) {
        <div class="bg-gold/10 border border-gold/30 rounded-lg p-5 mb-8">
          <h2 class="text-[16px] font-serif font-bold text-navy mb-2 flex items-center gap-2">
            <svg class="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Reviewing Application
          </h2>
          <p class="text-[14px] text-text-mid">
            You are reviewing this application as <span class="font-semibold text-navy">{{ fullName() }}</span>'s
            Association President. This is a read-only view. Please review the details carefully before endorsing or
            returning with comments.
          </p>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 mb-8">
        <div appCard heading="Personal Information">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ng-container *ngTemplateOutlet="field; context: { label: 'Reference Number', value: app().referenceNumber }" />
            <ng-container
              *ngTemplateOutlet="
                field;
                context: { label: 'Submitted At', value: app().submittedAt ? formatDate(app().submittedAt) : '-' }
              "
            />
            <ng-container *ngTemplateOutlet="field; context: { label: 'Full Name', value: fullName() }" />
            <ng-container *ngTemplateOutlet="field; context: { label: 'Email', value: app().email }" />
            <ng-container *ngTemplateOutlet="field; context: { label: 'Gender', value: app().gender }" />
            <ng-container *ngTemplateOutlet="field; context: { label: 'Phone', value: app().phone }" />
            <ng-container
              *ngTemplateOutlet="
                field;
                context: { label: 'Date of Birth', value: app().dateOfBirth ? formatDate(app().dateOfBirth) : '-' }
              "
            />
            <ng-container
              *ngTemplateOutlet="
                field;
                context: { label: 'Separation Date', value: app().separationDate ? formatDate(app().separationDate) : '-' }
              "
            />
            <ng-container *ngTemplateOutlet="field; context: { label: 'Nationality', value: app().nationality }" />
            <ng-container
              *ngTemplateOutlet="field; context: { label: 'Second Nationality', value: app().secondNationality }"
            />
          </div>
        </div>

        <div appCard heading="Association Details">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ng-container *ngTemplateOutlet="field; context: { label: 'Association Name', value: app().associationName }" />
            <ng-container
              *ngTemplateOutlet="field; context: { label: 'Association Country', value: app().associationCountry }"
            />
            <ng-container
              *ngTemplateOutlet="field; context: { label: 'General Email', value: app().associationGeneralEmail }"
            />
            <ng-container *ngTemplateOutlet="field; context: { label: 'President Email', value: app().presidentEmail }" />
            <ng-container *ngTemplateOutlet="field; context: { label: 'President Phone', value: app().presidentPhone }" />
            <ng-container
              *ngTemplateOutlet="field; context: { label: 'Associate Member Name', value: app().associateMemberName }"
            />
            <ng-container
              *ngTemplateOutlet="field; context: { label: 'Associate Member Country', value: app().associateMemberCountry }"
            />
          </div>
        </div>
      </div>

      <div appCard heading="Education">
        @if (educations().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[420px] text-left border-collapse">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Degree Name</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Institution</th>
                </tr>
              </thead>
              <tbody>
                @for (edu of educations(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ edu.degreeName || '-' }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ edu.institution || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light">No education details provided.</p>
        }
      </div>

      <div appCard heading="Languages">
        @if (languages().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[420px] text-left border-collapse">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Language</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Proficiency</th>
                </tr>
              </thead>
              <tbody>
                @for (lang of languages(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ lang.language }}</td>
                    <td class="py-3 text-[14px] text-text-mid capitalize">
                      {{ lang.proficiency ? lang.proficiency.replace('_', ' ') : '-' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light">No language details provided.</p>
        }
      </div>

      <div appCard heading="UN Experience">
        @if (unExperiences().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[520px] text-left border-collapse mb-4">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Agency</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Position Title</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Grade</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Area of Expertise</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
                </tr>
              </thead>
              <tbody>
                @for (exp of unExperiences(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.agency }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.positionTitle }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.grade || '-' }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.areaOfExpertise || '-' }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ durationLabel(exp.durationYears) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light mb-4">No UN experience provided.</p>
        }
        @if (app().unExperienceSummary) {
          <div class="bg-gray-50 p-4 rounded text-sm text-text-mid italic">"{{ app().unExperienceSummary }}"</div>
        }
      </div>

      <div appCard heading="Non-UN Experience">
        @if (nonUnExperiences().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[520px] text-left border-collapse mb-4">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Organization</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Position Title</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Area of Expertise</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
                </tr>
              </thead>
              <tbody>
                @for (exp of nonUnExperiences(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.organization }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.positionTitle }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.areaOfExpertise || '-' }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ durationLabel(exp.durationYears) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light mb-4">No Non-UN experience provided.</p>
        }
        @if (app().nonUnExperienceSummary) {
          <div class="bg-gray-50 p-4 rounded text-sm text-text-mid italic">"{{ app().nonUnExperienceSummary }}"</div>
        }
      </div>

      <div appCard heading="FAFICS Experience">
        @if (faficsExperiences().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[520px] text-left border-collapse mb-4">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Position Held</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Area of Contribution</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
                </tr>
              </thead>
              <tbody>
                @for (exp of faficsExperiences(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.positionHeld }}</td>
                    <td class="py-3 text-[14px] text-text-mid">
                      @let parts = contributionParts(exp);
                      @if (parts.length === 0) {
                        -
                      } @else {
                        <ul class="flex flex-col gap-1">
                          @for (c of parts; track $index) {
                            <li class="flex items-start gap-1.5">
                              <span class="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-navy-mid"></span>
                              <span>{{ c }}</span>
                            </li>
                          }
                        </ul>
                      }
                    </td>
                    <td class="py-3 text-[14px] text-text-mid">{{ durationLabel(exp.durationYears) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light mb-4">No FAFICS experience provided.</p>
        }
        @if (app().faficsExperienceSummary) {
          <div class="bg-gray-50 p-4 rounded text-sm text-text-mid italic">"{{ app().faficsExperienceSummary }}"</div>
        }
      </div>

      <div appCard heading="Local Association Experience">
        @if (localExperiences().length > 0) {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[520px] text-left border-collapse mb-4">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Position Held</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Area of Contribution</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
                </tr>
              </thead>
              <tbody>
                @for (exp of localExperiences(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.positionHeld }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ exp.areaOfContribution || '-' }}</td>
                    <td class="py-3 text-[14px] text-text-mid">{{ durationLabel(exp.durationYears) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-text-light mb-4">No local association experience provided.</p>
        }
        @if (app().localExperienceSummary) {
          <div class="bg-gray-50 p-4 rounded text-sm text-text-mid italic">"{{ app().localExperienceSummary }}"</div>
        }
      </div>

      <div appCard heading="Expertise Assessment">
        <!--
          Only show areas the applicant actually rated, marked preferred, or
          added as a custom area — unrated fixed areas are persisted as a full
          matrix but carry no information on a read-only review screen.
        -->
        @if (rated().length === 0) {
          <p class="text-sm text-text-light">No expertise areas rated.</p>
        } @else {
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full min-w-[360px] text-left border-collapse">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Area</th>
                  <th class="py-2 text-[12px] font-semibold text-navy uppercase">Level</th>
                </tr>
              </thead>
              <tbody>
                @for (exp of rated(); track $index) {
                  <tr class="border-b border-border last:border-0">
                    <td class="py-3 text-[14px] text-text-mid">
                      <span class="inline-flex flex-wrap items-center gap-2"
                        >{{ exp.areaLabel }}
                        @if (exp.isPreferred) {
                          <span
                            class="inline-flex items-center gap-1 rounded-full bg-gold-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold"
                          >
                            <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path
                                d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z"
                              /></svg
                            >Preferred
                          </span>
                        }
                      </span>
                      @if (exp.isCustom && exp.otherDescription) {
                        <span class="block text-[12px] text-text-light mt-0.5">{{ exp.otherDescription }}</span>
                      }
                    </td>
                    <td class="py-3 text-[14px] text-text-mid capitalize">{{ exp.expertiseLevel || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      @if (app().competencies?.length > 0) {
        <div appCard heading="Core Competencies">
          <div class="flex flex-wrap gap-2">
            @for (c of app().competencies; track $index) {
              <span class="inline-flex items-center rounded-full bg-gold-light px-3 py-1 text-[12.5px] font-medium text-gold">{{
                c
              }}</span>
            }
          </div>
        </div>
      }

      @if (committees().length > 0 || app().positionPreferenceRationale) {
        <div appCard heading="Position / Committee Preference">
          @if (committees().length > 0) {
            <div class="mb-3 flex flex-wrap gap-2">
              @for (c of committees(); track $index) {
                <span
                  class="inline-flex items-center rounded-full bg-navy-light px-3 py-1 text-[12.5px] font-medium text-navy-mid"
                  >{{ c }}</span
                >
              }
            </div>
          }
          @if (app().positionPreferenceRationale) {
            <div class="bg-gray-50 p-4 rounded text-sm text-text-mid italic">"{{ app().positionPreferenceRationale }}"</div>
          }
        </div>
      }

      @if (!isAdminView() && token()) {
        <div class="mt-12">
          <app-endorse-actions [token]="token()!" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EndorsementViewComponent {
  readonly application = input.required<any>();
  readonly token = input<string | undefined>(undefined);
  readonly isAdminView = input(false);

  protected readonly formatDate = formatDate;
  protected readonly durationLabel = durationLabel;
  protected readonly contributionParts = contributionParts;
  protected readonly app = this.application;

  protected readonly fullName = computed(() =>
    [this.app().firstName, this.app().middleName, this.app().lastName].filter(Boolean).join(' '),
  );

  protected readonly educations = computed(() => visibleEducations(this.app()));
  protected readonly languages = computed(() => visibleLanguages(this.app()));
  protected readonly unExperiences = computed(() => visibleUnExperiences(this.app()));
  protected readonly nonUnExperiences = computed(() => visibleNonUnExperiences(this.app()));
  protected readonly faficsExperiences = computed(() => visibleFaficsExperiences(this.app()));
  protected readonly localExperiences = computed(() => visibleLocalExperiences(this.app()));
  protected readonly rated = computed(() => ratedExpertise(this.app()));
  protected readonly committees = computed(() => preferredCommittees(this.app()));
}
