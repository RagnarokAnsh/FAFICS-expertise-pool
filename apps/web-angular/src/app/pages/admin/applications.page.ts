import { ChangeDetectionStrategy, Component, computed, effect, signal, untracked } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ApplicationTableComponent } from '../../components/admin/application-table';
import { adminApi } from '../../lib/api/admin.api';

// Human-readable labels for each status, plus the dashboard-stats key that
// holds its count so the dropdown only lists statuses that actually occur.
const STATUS_OPTIONS: { value: string; label: string; statKey: string }[] = [
  { value: 'draft', label: 'Draft', statKey: 'drafts' },
  { value: 'submitted', label: 'Submitted (Pending President)', statKey: 'pendingEndorsement' },
  { value: 'endorsed', label: 'Endorsed (Pending Review)', statKey: 'pendingReview' },
  { value: 'under_review', label: 'Under Review', statKey: 'underReview' },
  { value: 'changes_requested', label: 'Changes Requested', statKey: 'changesRequested' },
  { value: 'approved', label: 'Approved (Active in Pool)', statKey: 'activeInPool' },
  { value: 'rejected', label: 'Rejected', statKey: 'rejected' },
  { value: 'expired', label: 'Expired', statKey: 'expired' },
];

/** app/admin/applications/page.tsx */
@Component({
  selector: 'app-applications-page',
  imports: [ApplicationTableComponent],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p class="text-text-mid">Manage and review submissions to the Expertise Pool.</p>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-border flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5"
            >Search Name / Reference No.</label
          >
          <input
            type="text"
            placeholder="Search..."
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            class="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>
        <div class="w-[180px]">
          <label class="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">Status</label>
          <select
            [value]="status()"
            (change)="status.set($any($event.target).value)"
            class="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy bg-white truncate"
          >
            <option value="">All Statuses</option>
            @for (opt of statusOptions(); track opt.value) {
              <option [value]="opt.value" [selected]="opt.value === status()">{{ opt.label }}</option>
            }
          </select>
        </div>
        <div class="w-[180px]">
          <label class="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">Country</label>
          <select
            [value]="country()"
            (change)="country.set($any($event.target).value)"
            class="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy bg-white"
          >
            <option value="">All Countries</option>
            @for (c of countriesQ.data() ?? []; track c) {
              <option [value]="c" [selected]="c === country()">{{ c }}</option>
            }
          </select>
        </div>
        <button
          (click)="clearFilters()"
          class="h-[38px] px-4 rounded border border-border bg-gray-50 text-[13px] font-medium text-text-mid hover:bg-gray-100 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      @if (listQ.isError()) {
        <div class="bg-red-50 text-red-600 p-4 rounded mt-4 border border-red-100">
          Failed to load applications. Please try again later.
        </div>
      }

      <app-application-table
        [data]="listQ.data()?.data || []"
        [isLoading]="listQ.isLoading()"
        [page]="page()"
        [total]="listQ.data()?.total || 0"
        [limit]="limit"
        (pageChange)="page.set($event)"
        [hasRefresh]="true"
        (refresh)="handleRefresh()"
        [isRefreshing]="listQ.isFetching()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicationsPage {
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly search = signal('');
  private readonly debouncedSearch = signal('');
  protected readonly status = signal('');
  protected readonly country = signal('');

  protected readonly listQ = injectQuery(() => {
    const params = {
      page: this.page(),
      limit: this.limit,
      search: this.debouncedSearch(),
      status: this.status(),
      country: this.country(),
    };
    return {
      queryKey: ['applications', params],
      queryFn: () => adminApi.listApplications(params),
    };
  });

  // Fetch distinct countries for the filter dropdown
  protected readonly countriesQ = injectQuery(() => ({
    queryKey: ['distinct-countries'],
    queryFn: () => adminApi.getDistinctCountries(),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  }));

  // Per-status counts drive the status filter dropdown: only statuses that
  // actually occur in the data are offered.
  private readonly statsQ = injectQuery(() => ({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    staleTime: 5 * 60 * 1000,
  }));

  protected readonly statusOptions = computed(() => {
    const stats = this.statsQ.data();
    const loadedStatuses = new Set((this.listQ.data()?.data || []).map((app: any) => app.status));
    const status = this.status();
    return STATUS_OPTIONS.filter(
      (opt) =>
        Number(stats?.[opt.statKey] ?? 0) > 0 ||
        loadedStatuses.has(opt.value) ||
        opt.value === status, // never drop the currently selected status
    );
  });

  constructor() {
    // Debounce search
    effect((onCleanup) => {
      const search = this.search();
      const handler = setTimeout(() => this.debouncedSearch.set(search), 400);
      onCleanup(() => clearTimeout(handler));
    });

    // Reset page when filters change
    let first = true;
    effect(() => {
      this.debouncedSearch();
      this.status();
      this.country();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
      });
    });
  }

  protected handleRefresh(): void {
    this.listQ.refetch();
    this.statsQ.refetch();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.country.set('');
    this.page.set(1);
  }
}
