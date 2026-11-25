import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProfileModalComponent } from '../../components/admin/profile-modal';
import { RosterGridComponent } from '../../components/admin/roster-grid';
import { SectionHeaderComponent } from '../../components/admin/ui';
import { ToastService } from '../../core/toast.service';
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
          [disabled]="exporting() || filtered().length === 0"
          class="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid disabled:opacity-60"
        >
          {{ exporting() ? 'Preparing Excel…' : (filtersActive() ? 'Export these ' + filtered().length + ' to Excel' : '↓ Export to Excel') }}
        </button>
      </div>

      <!-- Controls: what officers look for when choosing an expert -->
      <div class="mb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-3 items-end rounded-theme border border-border bg-white px-4 py-3.5">
        <div>
          <label [class]="label" for="pool-search">Search</label>
          <input
            id="pool-search"
            type="text"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            placeholder="Name, nationality or association"
            [class]="field"
          />
        </div>
        <div>
          <label [class]="label" for="pool-area">Expertise area</label>
          <select id="pool-area" (change)="areaKey.set($any($event.target).value)" [class]="field">
            <option value="">Any area</option>
            @for (a of areas; track a.key) {
              <option [value]="a.key" [selected]="a.key === areaKey()">{{ a.label }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="pool-level">{{ areaKey() ? 'Level in this area' : 'Level (any area)' }}</label>
          <select id="pool-level" (change)="level.set($any($event.target).value)" [class]="field">
            @for (l of levels; track l.value) {
              <option [value]="l.value" [selected]="l.value === level()">{{ l.label }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="pool-language">Language</label>
          <select id="pool-language" (change)="language.set($any($event.target).value)" [class]="field">
            <option value="">Any language</option>
            @for (l of languageOptions(); track l) {
              <option [value]="l" [selected]="l === language()">{{ l }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="pool-nationality">Nationality</label>
          <select id="pool-nationality" (change)="nationality.set($any($event.target).value)" [class]="field">
            <option value="">Any nationality</option>
            @for (n of nationalityOptions(); track n) {
              <option [value]="n" [selected]="n === nationality()">{{ n }}</option>
            }
          </select>
        </div>
      </div>
      <div class="mb-4 flex min-h-[22px] items-center justify-end text-[12.5px] text-text-muted">
        @if (filtersActive()) {
          <button (click)="clearFilters()" class="underline underline-offset-2 hover:text-navy">Clear filters</button>
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
  protected readonly field =
    'h-[38px] w-full rounded-md border border-border bg-off-white px-3 text-[13px] text-text outline-none transition-colors focus:border-navy-mid focus:bg-white';
  protected readonly label = 'block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5';
  protected readonly areas = FIXED_EXPERTISE_AREAS;
  protected readonly levels = [
    { value: '', label: 'Any rating' },
    { value: 'advanced', label: 'Advanced or Expert' },
    { value: 'expert', label: 'Expert only' },
    { value: 'preferred', label: 'Marked as preferred' },
  ];
  protected readonly skeletons = Array.from({ length: 9 }, (_, i) => i);

  protected readonly search = signal('');
  protected readonly areaKey = signal('');
  protected readonly level = signal('');
  protected readonly language = signal('');
  protected readonly nationality = signal('');
  protected readonly selectedId = signal<string | null>(null);

  protected readonly query = injectQuery(() => ({
    queryKey: ['roster'],
    queryFn: () => adminApi.listApplications({ status: 'approved', limit: 1000, sort: 'name' }),
  }));

  private readonly applications = computed<any[]>(() => (this.query.data() as any)?.data ?? []);

  /** Choices built from the pool itself, so every option finds someone. */
  protected readonly languageOptions = computed(() =>
    [...new Set(this.applications().flatMap((a) => a.languages ?? []))].sort((x, y) => x.localeCompare(y)),
  );
  protected readonly nationalityOptions = computed(() =>
    [...new Set(this.applications().map((a) => a.nationality).filter(Boolean))].sort((x, y) => x.localeCompare(y)),
  );

  protected readonly filtersActive = computed(
    () => !!(this.search().trim() || this.areaKey() || this.level() || this.language() || this.nationality()),
  );

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const areaKey = this.areaKey();
    const level = this.level();
    const language = this.language();
    const nationality = this.nationality();

    // Does an area rating satisfy the chosen level?
    const meetsLevel = (e: any): boolean =>
      level === '' ? !!e.level || e.isPreferred
      : level === 'preferred' ? e.isPreferred
      : level === 'expert' ? e.level === 'expert'
      : e.level === 'advanced' || e.level === 'expert';

    return this.applications().filter((a: any) => {
      if (
        q &&
        ![`${a.firstName} ${a.lastName}`, a.referenceNumber, a.nationality, a.associationName, a.associationCountry].some(
          (v) => (v ?? '').toLowerCase().includes(q),
        )
      ) {
        return false;
      }
      if (language && !(a.languages ?? []).includes(language)) return false;
      if (nationality && a.nationality !== nationality) return false;
      if (areaKey || level) {
        const rows = (a.expertise ?? []).filter((e: any) => !areaKey || e.areaKey === areaKey);
        if (!rows.some(meetsLevel)) return false;
      }
      return true;
    });
  });

  protected readonly subtitle = computed(() => {
    if (this.query.isLoading()) return 'Loading…';
    const count = this.filtered().length;
    return `Showing ${count} active profile${count !== 1 ? 's' : ''}`;
  });

  protected readonly exporting = signal(false);
  private readonly toast = inject(ToastService);

  /** Exports exactly the profiles on screen (the whole pool when unfiltered). */
  protected async exportRoster(): Promise<void> {
    this.exporting.set(true);
    try {
      const filteredIds = this.filtersActive() ? this.filtered().map((a: any) => a.id) : undefined;
      await adminApi.exportRoster(filteredIds);
    } catch {
      this.toast.showToast('The Excel file could not be created. Please try again.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  protected clearFilters(): void {
    this.search.set('');
    this.areaKey.set('');
    this.level.set('');
    this.language.set('');
    this.nationality.set('');
  }
}
