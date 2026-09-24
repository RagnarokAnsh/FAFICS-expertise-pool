import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProfileModalComponent } from '../../components/admin/profile-modal';
import { RosterGridComponent } from '../../components/admin/roster-grid';
import { SectionHeaderComponent } from '../../components/admin/ui';
import { adminApi } from '../../lib/api/admin.api';
import { FIXED_EXPERTISE_AREAS } from '../../lib/constants/expertise';

/** app/admin/roster/page.tsx */
@Component({
  selector: 'app-roster-page',
  imports: [RosterGridComponent, ProfileModalComponent, SectionHeaderComponent],
  template: `
    <div class="mx-auto max-w-[1400px] p-6">
      <div appSectionHeader [subtitle]="subtitle()">
        <button
          sectionAction
          (click)="exportRoster()"
          class="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid"
        >
          ↓ Export CSV
        </button>
      </div>

      <!-- Controls -->
      <div class="mb-4 flex flex-wrap items-center gap-2.5 rounded-theme border border-border bg-white px-4 py-3.5">
        <div class="relative min-w-[200px] flex-1">
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            placeholder="Search by name, nationality, association…"
            class="h-[38px] w-full rounded-md border border-border bg-off-white pl-9 pr-3 text-[13px] text-text outline-none transition-colors focus:border-navy-mid focus:bg-white"
          />
        </div>
        <select
          [value]="areaFilter()"
          (change)="areaFilter.set($any($event.target).value)"
          class="h-[38px] cursor-pointer rounded-md border border-border bg-off-white px-3 text-[12.5px] text-text outline-none focus:border-navy-mid"
        >
          <option value="">All Expertise Areas</option>
          @for (a of areas; track a.key) {
            <option [value]="a.label" [selected]="a.label === areaFilter()">{{ a.label }}</option>
          }
        </select>
        @if (search() || areaFilter()) {
          <button
            (click)="clearFilters()"
            class="text-[12.5px] text-text-muted underline underline-offset-2 hover:text-navy"
          >
            Clear filters
          </button>
        }
      </div>

      @if (query.isError()) {
        <p class="mb-4 text-sm text-danger">Failed to load Expertise Pool.</p>
      }

      @if (query.isLoading()) {
        <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          @for (i of skeletons; track i) {
            <div class="overflow-hidden rounded-theme border border-border bg-white">
              <div class="flex items-center gap-3 bg-navy px-4 py-3">
                <div class="h-[38px] w-[38px] animate-pulse rounded-full bg-white/20"></div>
                <div class="flex-1">
                  <div class="mb-2 h-3 w-28 animate-pulse rounded bg-white/20"></div>
                  <div class="h-2 w-16 animate-pulse rounded bg-white/10"></div>
                </div>
              </div>
              <div class="h-16 animate-pulse bg-off-white"></div>
            </div>
          }
        </div>
      } @else {
        <app-roster-grid [applications]="filtered()" (selected)="selectedId.set($event)" />
      }

      <app-profile-modal [applicationId]="selectedId()" (closed)="selectedId.set(null)" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class RosterPage {
  protected readonly search = signal('');
  protected readonly areaFilter = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly areas = FIXED_EXPERTISE_AREAS;
  protected readonly skeletons = Array.from({ length: 9 }, (_, i) => i);

  protected readonly query = injectQuery(() => ({
    queryKey: ['roster'],
    queryFn: () => adminApi.listApplications({ status: 'approved', limit: 500 }),
  }));

  private readonly applications = computed<any[]>(() => this.query.data()?.data ?? []);

  protected readonly filtered = computed(() => {
    let list = this.applications();
    const search = this.search();
    const areaFilter = this.areaFilter();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a: any) =>
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
          (a.associationName ?? '').toLowerCase().includes(q) ||
          (a.associationCountry ?? '').toLowerCase().includes(q) ||
          (a.nationality ?? '').toLowerCase().includes(q) ||
          (a.referenceNumber ?? '').toLowerCase().includes(q),
      );
    }
    if (areaFilter) {
      list = list.filter((a: any) =>
        a.preferredAreas?.some((area: string) => area.toLowerCase().includes(areaFilter.toLowerCase())),
      );
    }
    return list;
  });

  protected readonly subtitle = computed(() => {
    if (this.query.isLoading()) return 'Loading…';
    const count = this.filtered().length;
    return `Showing ${count} active profile${count !== 1 ? 's' : ''}`;
  });

  protected exportRoster(): void {
    adminApi.exportRoster();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.areaFilter.set('');
  }
}
