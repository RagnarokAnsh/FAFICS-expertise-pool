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

// Experience tables (3-5 columns): a normal table from `sm` up; on phones each row
// becomes a small card whose cells show their column name (data-label) above the
// value. Every table shares column boundaries (28% / 54% / 82%) so cards line up.
const TABLE = 'block w-full text-left sm:table sm:table-fixed sm:border-collapse';
const COLS = 'hidden sm:table-column-group';
const THEAD = 'hidden sm:table-header-group';
const TH = 'py-2 pr-4 last:pr-0 border-b border-border text-[12px] font-semibold uppercase text-navy';
const TBODY = 'block sm:table-row-group';
const TR = 'grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border py-3 last:border-0 sm:table-row';
const TD_BASE =
  'block min-w-0 break-words text-[14px] sm:table-cell sm:py-3 sm:pr-4 sm:align-top sm:last:pr-0 ' +
  'before:mb-0.5 before:block before:text-[11px] before:font-normal before:uppercase before:tracking-[0.03em] ' +
  'before:text-text-light before:content-[attr(data-label)] sm:before:content-none';
const TD = TD_BASE + ' text-text-mid';
// The row's main value: emphasised, and full width on phones.
const TD_MAIN = TD_BASE + ' col-span-2 font-medium text-navy sm:col-span-1';

// Two-column tables fit a phone screen, so they stay plain tables everywhere.
const TABLE2 = 'w-full table-fixed border-collapse text-left';
const TR2 = 'border-b border-border last:border-0';
const TD2_BASE = 'py-3 pr-4 last:pr-0 align-top break-words text-[14px]';
const TD2 = TD2_BASE + ' text-text-mid';
const TD2_FIRST = TD2_BASE + ' font-medium text-navy';

/**
 * The read-only application profile (Angular only), shared by the admin
 * application page and the President's review page
 * (components/endorse/endorsement-view.ts). Laid out as aligned field grids and
 * tables with shared column widths, so the cards line up with each other.
 */
@Component({
  selector: 'app-application-profile',
  imports: [NgTemplateOutlet, CardComponent],
  template: `
    <ng-template #field let-label="label" let-value="value">
      <div class="min-w-0">
        <dt class="mb-1 text-[11px] font-medium uppercase tracking-[0.03em] text-text-light">{{ label }}</dt>
        <!-- Long unbroken values (emails) must wrap, not clip at the card edge. -->
        <dd class="break-words text-[14px] font-medium text-navy [overflow-wrap:anywhere]">{{ value || '-' }}</dd>
      </div>
    </ng-template>

    <ng-template #summary let-text="text">
      @if (text) {
        <div class="mt-4 rounded bg-gray-50 p-4 text-sm italic text-text-mid">"{{ text }}"</div>
      }
    </ng-template>

    <div appCard heading="Personal Information">
      <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 2xl:grid-cols-3">
        <ng-container *ngTemplateOutlet="field; context: { label: 'Full Name', value: fullName() }" />
        <ng-container *ngTemplateOutlet="field; context: { label: 'Email', value: app().email }" />
        <ng-container *ngTemplateOutlet="field; context: { label: 'Phone', value: app().phone }" />
        <ng-container *ngTemplateOutlet="field; context: { label: 'Gender', value: app().gender }" />
        <ng-container *ngTemplateOutlet="field; context: { label: 'Date of Birth', value: date(app().dateOfBirth) }" />
        <ng-container
          *ngTemplateOutlet="field; context: { label: 'Separation Date', value: date(app().separationDate) }"
        />
        <ng-container *ngTemplateOutlet="field; context: { label: 'Nationality', value: app().nationality }" />
        <ng-container
          *ngTemplateOutlet="field; context: { label: 'Second Nationality', value: app().secondNationality }"
        />
      </dl>
    </div>

    <div appCard heading="Association Details">
      <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 2xl:grid-cols-3">
        <ng-container *ngTemplateOutlet="field; context: { label: 'Association Name', value: app().associationName }" />
        <ng-container
          *ngTemplateOutlet="field; context: { label: 'Association Country', value: app().associationCountry }"
        />
        <ng-container *ngTemplateOutlet="field; context: { label: 'President Email', value: app().presidentEmail }" />
        <ng-container *ngTemplateOutlet="field; context: { label: 'President Phone', value: app().presidentPhone }" />
        <ng-container
          *ngTemplateOutlet="field; context: { label: 'General Email', value: app().associationGeneralEmail }"
        />
        @if (app().associateMemberName || app().associateMemberCountry) {
          <ng-container
            *ngTemplateOutlet="field; context: { label: 'Associate Member Name', value: app().associateMemberName }"
          />
          <ng-container
            *ngTemplateOutlet="field; context: { label: 'Associate Member Country', value: app().associateMemberCountry }"
          />
        }
      </dl>
    </div>

    <div appCard heading="Education">
      @if (educations().length > 0) {
        <table [class]="cls.table2">
          <colgroup><col class="w-[54%]" /><col /></colgroup>
          <thead>
            <tr>
              <th [class]="cls.th">Degree Name</th>
              <th [class]="cls.th">Institution</th>
            </tr>
          </thead>
          <tbody>
            @for (edu of educations(); track $index) {
              <tr [class]="cls.tr2">
                <td [class]="cls.td2First">{{ edu.degreeName || '-' }}</td>
                <td [class]="cls.td2">{{ edu.institution || '-' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No education details provided.</p>
      }
    </div>

    <div appCard heading="Languages">
      @if (languages().length > 0) {
        <table [class]="cls.table2">
          <colgroup><col class="w-[54%]" /><col /></colgroup>
          <thead>
            <tr>
              <th [class]="cls.th">Language</th>
              <th [class]="cls.th">Proficiency</th>
            </tr>
          </thead>
          <tbody>
            @for (lang of languages(); track $index) {
              <tr [class]="cls.tr2">
                <td [class]="cls.td2First">{{ lang.language }}</td>
                <td [class]="cls.td2 + ' capitalize'">
                  {{ lang.proficiency ? lang.proficiency.replace('_', ' ') : '-' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No language details provided.</p>
      }
    </div>

    <div appCard heading="UN Experience">
      @if (unExperiences().length > 0) {
        <table [class]="cls.table">
          <colgroup [class]="cls.cols">
            <col class="w-[14%]" /><col class="w-[28%]" /><col class="w-[12%]" /><col class="w-[28%]" /><col />
          </colgroup>
          <thead [class]="cls.thead">
            <tr>
              <th [class]="cls.th">Agency</th>
              <th [class]="cls.th">Position Title</th>
              <th [class]="cls.th">Grade</th>
              <th [class]="cls.th">Area of Expertise</th>
              <th [class]="cls.th">Duration</th>
            </tr>
          </thead>
          <tbody [class]="cls.tbody">
            @for (exp of unExperiences(); track $index) {
              <tr [class]="cls.tr">
                <td [class]="cls.tdMain" data-label="Agency">{{ exp.agency || '-' }}</td>
                <td [class]="cls.td" data-label="Position Title">{{ exp.positionTitle || '-' }}</td>
                <td [class]="cls.td" data-label="Grade">{{ exp.grade || '-' }}</td>
                <td [class]="cls.td" data-label="Area of Expertise">{{ exp.areaOfExpertise || '-' }}</td>
                <td [class]="cls.td" data-label="Duration">{{ durationLabel(exp.durationYears) }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No UN experience provided.</p>
      }
      <ng-container *ngTemplateOutlet="summary; context: { text: app().unExperienceSummary }" />
    </div>

    <div appCard heading="Non-UN Experience">
      @if (nonUnExperiences().length > 0) {
        <table [class]="cls.table">
          <colgroup [class]="cls.cols">
            <col class="w-[28%]" /><col class="w-[26%]" /><col class="w-[28%]" /><col />
          </colgroup>
          <thead [class]="cls.thead">
            <tr>
              <th [class]="cls.th">Organization</th>
              <th [class]="cls.th">Position Title</th>
              <th [class]="cls.th">Area of Expertise</th>
              <th [class]="cls.th">Duration</th>
            </tr>
          </thead>
          <tbody [class]="cls.tbody">
            @for (exp of nonUnExperiences(); track $index) {
              <tr [class]="cls.tr">
                <td [class]="cls.tdMain" data-label="Organization">{{ exp.organization || '-' }}</td>
                <td [class]="cls.td" data-label="Position Title">{{ exp.positionTitle || '-' }}</td>
                <td [class]="cls.td" data-label="Area of Expertise">{{ exp.areaOfExpertise || '-' }}</td>
                <td [class]="cls.td" data-label="Duration">{{ durationLabel(exp.durationYears) }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No Non-UN experience provided.</p>
      }
      <ng-container *ngTemplateOutlet="summary; context: { text: app().nonUnExperienceSummary }" />
    </div>

    <div appCard heading="FAFICS Experience">
      @if (faficsExperiences().length > 0) {
        <table [class]="cls.table">
          <colgroup [class]="cls.cols"><col class="w-[28%]" /><col class="w-[54%]" /><col /></colgroup>
          <thead [class]="cls.thead">
            <tr>
              <th [class]="cls.th">Position Held</th>
              <th [class]="cls.th">Area of Contribution</th>
              <th [class]="cls.th">Duration</th>
            </tr>
          </thead>
          <tbody [class]="cls.tbody">
            @for (exp of faficsExperiences(); track $index) {
              @let parts = contributionParts(exp);
              <tr [class]="cls.tr">
                <td [class]="cls.tdMain" data-label="Position Held">{{ exp.positionHeld }}</td>
                <td [class]="cls.td" data-label="Area of Contribution">
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
                <td [class]="cls.td" data-label="Duration">{{ durationLabel(exp.durationYears) }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No FAFICS experience provided.</p>
      }
      <ng-container *ngTemplateOutlet="summary; context: { text: app().faficsExperienceSummary }" />
    </div>

    <div appCard heading="Local Association Experience">
      @if (localExperiences().length > 0) {
        <table [class]="cls.table">
          <colgroup [class]="cls.cols"><col class="w-[28%]" /><col class="w-[54%]" /><col /></colgroup>
          <thead [class]="cls.thead">
            <tr>
              <th [class]="cls.th">Position Held</th>
              <th [class]="cls.th">Area of Contribution</th>
              <th [class]="cls.th">Duration</th>
            </tr>
          </thead>
          <tbody [class]="cls.tbody">
            @for (exp of localExperiences(); track $index) {
              <tr [class]="cls.tr">
                <td [class]="cls.tdMain" data-label="Position Held">{{ exp.positionHeld }}</td>
                <td [class]="cls.td" data-label="Area of Contribution">{{ exp.areaOfContribution || '-' }}</td>
                <td [class]="cls.td" data-label="Duration">{{ durationLabel(exp.durationYears) }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="text-sm text-text-light">No local association experience provided.</p>
      }
      <ng-container *ngTemplateOutlet="summary; context: { text: app().localExperienceSummary }" />
    </div>

    <div appCard heading="Expertise Assessment">
      @if (rated().length === 0) {
        <p class="text-sm text-text-light">No expertise areas rated.</p>
      } @else {
        <table [class]="cls.table2">
          <colgroup><col class="w-[54%]" /><col /></colgroup>
          <thead>
            <tr>
              <th [class]="cls.th">Area</th>
              <th [class]="cls.th">Level</th>
            </tr>
          </thead>
          <tbody>
            @for (exp of rated(); track $index) {
              <tr [class]="cls.tr2">
                <td [class]="cls.td2First">
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
                    <span class="mt-0.5 block text-[12px] font-normal text-text-light">{{ exp.otherDescription }}</span>
                  }
                </td>
                <td [class]="cls.td2 + ' capitalize'">{{ exp.expertiseLevel || '-' }}</td>
              </tr>
            }
          </tbody>
        </table>
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
          <div class="flex flex-wrap gap-2">
            @for (c of committees(); track $index) {
              <span
                class="inline-flex items-center rounded-full bg-navy-light px-3 py-1 text-[12.5px] font-medium text-navy-mid"
                >{{ c }}</span
              >
            }
          </div>
        }
        @if (app().positionPreferenceRationale) {
          <div
            [class]="(committees().length > 0 ? 'mt-4 ' : '') + 'rounded bg-gray-50 p-4 text-sm italic text-text-mid'"
          >
            "{{ app().positionPreferenceRationale }}"
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class ApplicationProfileComponent {
  readonly application = input.required<any>();

  protected readonly app = this.application;
  protected readonly durationLabel = durationLabel;
  protected readonly contributionParts = contributionParts;
  protected readonly cls = {
    table: TABLE,
    cols: COLS,
    thead: THEAD,
    th: TH,
    tbody: TBODY,
    tr: TR,
    td: TD,
    tdMain: TD_MAIN,
    table2: TABLE2,
    tr2: TR2,
    td2: TD2,
    td2First: TD2_FIRST,
  };

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

  protected date(value: string | null | undefined): string {
    return value ? formatDate(value) : '-';
  }
}
