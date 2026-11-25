import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { formatDate } from '../../lib/utils/date';
import { BadgeComponent } from '../ui/badge';
import { WaitingFlagComponent } from './waiting-flag';

/** components/admin/ApplicationTable.tsx */
@Component({
  selector: 'app-application-table',
  imports: [NgTemplateOutlet, RouterLink, BadgeComponent, WaitingFlagComponent],
  template: `
    <ng-template #refreshButton>
      <button
        (click)="refresh.emit()"
        [disabled]="isRefreshing()"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          [attr.class]="'h-3.5 w-3.5 ' + (isRefreshing() ? 'animate-spin' : '')"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" /></svg
        >{{ isRefreshing() ? 'Refreshing...' : 'Refresh' }}
      </button>
    </ng-template>

    @if (isLoading()) {
      <div class="p-8 text-center text-text-light">Loading applications...</div>
    } @else if (data().length === 0) {
      <div class="bg-white border border-border rounded-lg mt-4 shadow-sm">
        @if (hasRefresh()) {
          <div class="flex items-center justify-end px-4 py-2.5 border-b border-border">
            <ng-container *ngTemplateOutlet="refreshButton" />
          </div>
        }
        <div class="p-8 text-center text-text-light">No applications found.</div>
      </div>
    } @else {
      <div class="bg-white border border-border rounded-lg overflow-hidden mt-4 shadow-sm">
        @if (hasRefresh()) {
          <div class="flex items-center justify-end px-4 py-2.5 border-b border-border">
            <ng-container *ngTemplateOutlet="refreshButton" />
          </div>
        }
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-border">
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Reference No</th>
                <th class="py-3 px-2 md:px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Association</th>
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Country</th>
                <th class="py-3 px-2 md:px-4 text-[12px] font-semibold text-navy uppercase">Status</th>
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Submitted</th>
                <th class="py-3 px-2 md:px-4 text-[12px] font-semibold text-navy uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (app of data(); track app.id) {
                <tr class="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                  <td class="hidden md:table-cell py-3 px-4 text-[14px] text-text-mid font-mono">{{ app.referenceNumber }}</td>
                  <td class="py-3 px-2 md:px-4 text-[14px] text-navy font-semibold">
                    {{ fullName(app) }}
                    <!-- Phones: the hidden Reference and Association columns, under the name. -->
                    <span class="md:hidden block text-[12px] font-normal text-text-light">
                      <span class="font-mono">{{ app.referenceNumber || 'Draft' }}</span> · {{ app.associationName }}
                    </span>
                  </td>
                  <td class="hidden md:table-cell py-3 px-4 text-[14px] text-text-mid">{{ app.associationName }}</td>
                  <td class="hidden md:table-cell py-3 px-4 text-[14px] text-text-mid">{{ app.associationCountry }}</td>
                  <td class="py-3 px-2 md:px-4">
                    <div class="flex flex-col items-start gap-1">
                      <span appBadge [status]="app.status"></span>
                      @if (app.status === 'submitted') {
                        <span appWaitingFlag [submittedAt]="app.submittedAt"></span>
                      }
                    </div>
                  </td>
                  <td class="hidden md:table-cell py-3 px-4 text-[14px] text-text-light">{{ formatDate(app.submittedAt) }}</td>
                  <td class="py-3 px-2 md:px-4 text-right">
                    <a
                      [routerLink]="'/admin/applications/' + app.id"
                      class="text-[13px] font-semibold text-gold hover:text-gold-hover hover:underline"
                      >Review</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="bg-gray-50 p-4 border-t border-border flex items-center justify-between">
          <div class="text-[13px] text-text-light">
            Showing <span class="font-semibold text-navy">{{ start() }}</span>&ndash;<span class="font-semibold text-navy">{{
              end()
            }}</span>
            of <span class="font-semibold text-navy">{{ effectiveTotal() }}</span>
          </div>
          @if (totalPages() > 1) {
            <div class="flex items-center gap-2">
              <button
                (click)="pageChange.emit(page() - 1)"
                [disabled]="page() === 1"
                class="px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                (click)="pageChange.emit(page() + 1)"
                [disabled]="page() === totalPages()"
                class="px-3 py-1.5 border border-border bg-white rounded text-[13px] font-medium text-navy disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicationTableComponent {
  readonly data = input.required<any[]>();
  readonly isLoading = input.required<boolean>();
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly limit = input.required<number>();
  readonly isRefreshing = input(false);
  /** True when a (refresh) handler is wired, like passing onRefresh in React. */
  readonly hasRefresh = input(false);
  readonly pageChange = output<number>();
  readonly refresh = output<void>();

  protected readonly formatDate = formatDate;
  protected readonly effectiveTotal = computed(() => this.total() || this.data().length);
  protected readonly totalPages = computed(() => Math.ceil(this.effectiveTotal() / this.limit()));
  protected readonly start = computed(() => (this.page() - 1) * this.limit() + 1);
  protected readonly end = computed(() => this.start() + this.data().length - 1);

  protected fullName(app: any): string {
    return [app.firstName, app.lastName].filter(Boolean).join(' ');
  }
}
