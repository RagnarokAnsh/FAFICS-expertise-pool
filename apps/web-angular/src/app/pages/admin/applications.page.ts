import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ApplicationTableComponent } from '../../components/admin/application-table';
import { ToastService } from '../../core/toast.service';
import { adminApi } from '../../lib/api/admin.api';
import { canExport, currentRole } from '../../lib/auth/roles';

/**
 * The status filter. The default hides drafts (applications not submitted
 * yet), which officers have nothing to act on. Statuses no longer produced by
 * the process (endorsed, under review, rejected, expired) are only offered if
 * old records still have them (`statKey` count > 0).
 */
const STATUS_OPTIONS: { value: string; label: string; statKey?: string }[] = [
  { value: '', label: 'All submitted' },
  { value: 'submitted', label: 'Awaiting President' },
  { value: 'waiting7', label: 'Awaiting 7+ days' },
  { value: 'changes_requested', label: 'Returned for Changes' },
  { value: 'approved', label: 'Active in Pool' },
  { value: 'draft', label: 'Drafts (not submitted)' },
  { value: 'endorsed', label: 'Endorsed', statKey: 'pendingReview' },
  { value: 'under_review', label: 'Under Review', statKey: 'underReview' },
  { value: 'rejected', label: 'Rejected', statKey: 'rejected' },
  { value: 'expired', label: 'Expired', statKey: 'expired' },
  { value: 'all', label: 'All, including drafts' },
];

const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'oldest', label: 'Oldest submission first' },
  { value: 'newest', label: 'Newest submission first' },
  { value: 'name', label: 'Surname A–Z' },
];

const FIELD = 'w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy bg-white';
const LABEL = 'block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5';

/** Officer workflow view: every application, filtered by where it stands. */
@Component({
  selector: 'app-applications-page',
  imports: [ApplicationTableComponent],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <p class="text-text-mid">Manage and review submissions to the Expertise Pool.</p>
        @if (canExport) {
          <button
            (click)="exportExcel()"
            [disabled]="exporting() || (listQ.data()?.total ?? 0) === 0"
            class="shrink-0 rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid disabled:opacity-60"
          >
            {{ exporting() ? 'Preparing Excel…' : 'Export ' + (listQ.data()?.total ?? 0) + ' to Excel' }}
          </button>
        }
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-4 items-end">
        <div>
          <label [class]="label" for="filter-search">Search</label>
          <input
            id="filter-search"
            type="text"
            placeholder="Name, email or reference"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            [class]="field"
          />
        </div>
        <div>
          <label [class]="label" for="filter-status">Status</label>
          <select id="filter-status" (change)="status.set($any($event.target).value)" [class]="field">
            @for (opt of statusOptions(); track opt.value) {
              <option [value]="opt.value" [selected]="opt.value === status()">{{ opt.label }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="filter-association">Association</label>
          <select id="filter-association" (change)="association.set($any($event.target).value)" [class]="field">
            <option value="">All associations</option>
            @for (a of associations(); track a) {
              <option [value]="a" [selected]="a === association()">{{ a }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="filter-country">Association country</label>
          <select id="filter-country" (change)="setCountry($any($event.target).value)" [class]="field">
            <option value="">All countries</option>
            @for (c of countriesQ.data() ?? []; track c) {
              <option [value]="c" [selected]="c === country()">{{ c }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="filter-sort">Sort by</label>
          <select id="filter-sort" (change)="sort.set($any($event.target).value)" [class]="field">
            @for (opt of sortOptions; track opt.value) {
              <option [value]="opt.value" [selected]="opt.value === sort()">{{ opt.label }}</option>
            }
          </select>
        </div>
      </div>
      <div class="mt-2 flex min-h-[22px] items-center justify-between gap-3 text-[12.5px] text-text-muted">
        <span>{{ (listQ.data()?.total ?? 0) }} {{ (listQ.data()?.total ?? 0) === 1 ? 'application' : 'applications' }}</span>
        @if (filtersActive()) {
          <button (click)="clearFilters()" class="underline underline-offset-2 hover:text-navy">Clear filters</button>
        }
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
  private readonly toast = inject(ToastService);
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly search = signal('');
  private readonly debouncedSearch = signal('');
  protected readonly status = signal('');
  protected readonly association = signal('');
  protected readonly country = signal('');
  protected readonly sort = signal('updated');
  /** Downloads are limited to roles that may export (not view-only roles). */
  protected readonly canExport = canExport(currentRole());
  protected readonly exporting = signal(false);

  /** The API filters for the current choices (also used by the Excel export). */
  private readonly filters = computed(() => {
    const status = this.status();
    return {
      search: this.debouncedSearch() || undefined,
      status: ['', 'all', 'waiting7'].includes(status) ? undefined : status,
      excludeDrafts: status === '' ? true : undefined,
      waitingMinDays: status === 'waiting7' ? 7 : undefined,
      association: this.association() || undefined,
      country: this.country() || undefined,
      sort: this.sort(),
    };
  });

  protected readonly listQ = injectQuery(() => {
    const params = { page: this.page(), limit: this.limit, ...this.filters() };
    return {
      queryKey: ['applications', params],
      queryFn: () => adminApi.listApplications(params),
    };
  });

  protected readonly countriesQ = injectQuery(() => ({
    queryKey: ['distinct-countries'],
    queryFn: () => adminApi.getDistinctCountries(),
    staleTime: 5 * 60 * 1000,
  }));

  private readonly associationsQ = injectQuery(() => ({
    queryKey: ['distinct-associations'],
    queryFn: () => adminApi.getDistinctAssociations(),
    staleTime: 5 * 60 * 1000,
  }));

  /** Association names; with a country chosen, only that country's. */
  protected readonly associations = computed(() => {
    const country = this.country().toLowerCase();
    const names = (this.associationsQ.data() ?? [])
      .filter((a) => !country || a.country.toLowerCase() === country)
      .map((a) => a.name);
    return [...new Set(names)];
  });

  private readonly statsQ = injectQuery(() => ({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    staleTime: 5 * 60 * 1000,
  }));

  protected readonly statusOptions = computed(() => {
    const stats = this.statsQ.data();
    const status = this.status();
    return STATUS_OPTIONS.filter(
      (opt) => !opt.statKey || Number(stats?.[opt.statKey] ?? 0) > 0 || opt.value === status,
    );
  });

  protected readonly filtersActive = computed(
    () => !!(this.search() || this.status() || this.association() || this.country() || this.sort() !== 'updated'),
  );

  constructor() {
    // Debounce search
    effect((onCleanup) => {
      const search = this.search();
      const handler = setTimeout(() => this.debouncedSearch.set(search), 400);
      onCleanup(() => clearTimeout(handler));
    });

    // Back to page 1 whenever the filters change
    let first = true;
    effect(() => {
      this.filters();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
      });
    });
  }

  /** A chosen association from another country no longer applies. */
  protected setCountry(country: string): void {
    this.country.set(country);
    if (this.association() && !this.associations().includes(this.association())) this.association.set('');
  }

  protected handleRefresh(): void {
    this.listQ.refetch();
    this.statsQ.refetch();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.debouncedSearch.set('');
    this.status.set('');
    this.association.set('');
    this.country.set('');
    this.sort.set('updated');
    this.page.set(1);
  }

  /** Exports every application matching the filters (all pages), in the same order. */
  protected async exportExcel(): Promise<void> {
    this.exporting.set(true);
    try {
      await adminApi.exportApplications(this.filters());
    } catch {
      this.toast.showToast('The Excel file could not be created. Please try again.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }
}
