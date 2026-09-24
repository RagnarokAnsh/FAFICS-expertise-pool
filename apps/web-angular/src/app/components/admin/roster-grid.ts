import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatDate } from '../../lib/utils/date';
import { StatusBadgeComponent } from './ui';

export interface ApplicationSummary {
  id: string;
  referenceNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  associationName: string;
  associationCountry: string;
  status: string;
  preferredAreas: string[];
  expiresAt: string | null;
  nationality?: string;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return null;
  return `Expires ${formatDate(expiresAt)}`;
}

/** components/admin/RosterGrid.tsx */
@Component({
  selector: 'app-roster-grid',
  imports: [StatusBadgeComponent],
  template: `
    @if (!applications().length) {
      <div class="py-14 text-center text-text-muted">
        <svg class="mx-auto mb-3 h-11 w-11 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <h4 class="mb-1 text-[14px] text-text-mid">No profiles found</h4>
        <p class="text-[12.5px]">Try adjusting your search or filters.</p>
      </div>
    } @else {
      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        @for (app of applications(); track app.id) {
          <button
            (click)="selected.emit(app.id)"
            class="group flex h-full flex-col overflow-hidden rounded-theme border border-border bg-white text-left shadow-theme transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
          >
            <div class="flex w-full items-center gap-3 bg-navy px-4 py-3">
              <div
                class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-gold font-serif text-[14px] font-bold text-white"
              >
                {{ initials(app) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[13.5px] font-semibold text-white">{{ app.firstName }} {{ app.lastName }}</div>
                <div class="truncate text-[11px] text-white/50">{{ subline(app) }}</div>
              </div>
              @if (app.referenceNumber) {
                <div class="shrink-0 text-[10px] text-white/30">{{ app.referenceNumber }}</div>
              }
            </div>

            <div class="flex-1 w-full px-4 py-3">
              @if (app.preferredAreas.length > 0) {
                <div class="flex flex-wrap gap-1.5">
                  @for (area of app.preferredAreas.slice(0, 3); track area) {
                    <span class="rounded-[10px] border border-gold bg-gold-light px-2 py-[3px] text-[10px] font-semibold text-[#7a5010]">{{
                      area
                    }}</span>
                  }
                  @if (app.preferredAreas.length > 3) {
                    <span class="px-1 py-[3px] text-[10px] text-text-muted">+{{ app.preferredAreas.length - 3 }}</span>
                  }
                </div>
              } @else {
                <div class="text-[11.5px] text-text-muted">No preferred areas listed</div>
              }
            </div>

            <div class="mt-auto flex w-full items-center justify-between border-t border-border px-4 py-2.5">
              <span appStatusBadge [status]="app.status"></span>
              <span class="text-[10.5px] text-text-muted">{{ expiryLabel(app.expiresAt) }}</span>
            </div>
          </button>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class RosterGridComponent {
  readonly applications = input.required<ApplicationSummary[]>();
  readonly selected = output<string>();
  protected readonly expiryLabel = expiryLabel;

  protected initials(app: ApplicationSummary): string {
    return getInitials(app.firstName, app.lastName);
  }

  protected subline(app: ApplicationSummary): string {
    return [app.nationality, app.associationName].filter(Boolean).join(' · ');
  }
}
