import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import {
  ExpertiseBarChartComponent,
  GenderDonutChartComponent,
  GradeBarChartComponent,
  LanguageBarChartComponent,
  NationalityBarChartComponent,
} from '../../components/admin/charts/charts';
import { ReportCardComponent, SectionHeaderComponent } from '../../components/admin/ui';
import { adminApi } from '../../lib/api/admin.api';

/**
 * app/admin/reports/page.tsx — reachable by URL; its sidebar link stays
 * commented out ("Hidden per client feedback"), exactly as in the React app.
 */
@Component({
  selector: 'app-reports-page',
  imports: [
    ReportCardComponent,
    SectionHeaderComponent,
    ExpertiseBarChartComponent,
    NationalityBarChartComponent,
    GenderDonutChartComponent,
    LanguageBarChartComponent,
    GradeBarChartComponent,
  ],
  template: `
    @if (query.isError()) {
      <div class="p-6"><p class="text-sm text-danger">Failed to load analytics data.</p></div>
    } @else {
      <div class="mx-auto max-w-[1200px] p-6">
        <div appSectionHeader subtitle="Insights across all approved profiles active in the Expertise Pool.">
          <button
            sectionAction
            (click)="exportRoster()"
            class="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid"
          >
            ↓ Export CSV
          </button>
        </div>

        @if (query.isLoading()) {
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            @for (i of skeletons; track i) {
              <div class="rounded-theme border border-border bg-white p-5 shadow-theme">
                <div class="mb-4 h-3 w-40 animate-pulse rounded bg-off-white"></div>
                <div class="h-64 animate-pulse rounded bg-off-white"></div>
              </div>
            }
          </div>
        } @else {
          @let data = query.data();
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div class="xl:col-span-2">
              <div appReportCard heading="Expertise Distribution (Preferred Areas)">
                <app-expertise-bar-chart [data]="data?.expertiseDistribution ?? []" />
              </div>
            </div>
            <div appReportCard heading="Nationality Breakdown (Top 15)">
              <app-nationality-bar-chart [data]="data?.nationalityBreakdown ?? []" />
            </div>
            <div appReportCard heading="Gender Balance">
              <app-gender-donut-chart [data]="data?.genderBalance ?? []" />
            </div>
            <div appReportCard heading="Language Coverage">
              <app-language-bar-chart [data]="data?.languageCoverage ?? []" />
            </div>
            <div appReportCard heading="UN Grade Distribution">
              <app-grade-bar-chart [data]="data?.gradeDistribution ?? []" />
            </div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ReportsPage {
  protected readonly skeletons = [0, 1, 2, 3, 4];
  protected readonly query = injectQuery(() => ({ queryKey: ['analytics'], queryFn: adminApi.getAnalytics }));

  protected exportRoster(): void {
    adminApi.exportRoster();
  }
}
