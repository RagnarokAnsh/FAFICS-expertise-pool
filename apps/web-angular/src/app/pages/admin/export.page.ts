import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonComponent } from '../../components/ui/button';
import { adminApi } from '../../lib/api/admin.api';

/** app/admin/export/page.tsx */
@Component({
  selector: 'app-export-page',
  imports: [ButtonComponent],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto">
      <div class="mb-8">
        <p class="text-text-mid">Download the current FAFICS Expertise Pool data.</p>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div class="p-6 md:p-8">
          <div class="flex items-start gap-4 mb-8">
            <div class="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-serif font-bold text-navy mb-2">Excel Export</h2>
              <p class="text-sm text-text-mid leading-relaxed">
                The export contains a complete spreadsheet of all <strong>Approved</strong> applications currently active in
                the Expertise Pool. It includes personal details, association info, full experience histories, and the
                complete expertise assessment.
              </p>
            </div>
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded text-sm mb-6 border border-red-100">{{ error() }}</div>
          }

          <div class="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100">
            <div class="text-sm text-text-light mb-4 sm:mb-0">
              @if (lastExport()) {
                <span>Last exported: {{ lastExport()!.toLocaleString() }}</span>
              } @else {
                <span>Ready to download</span>
              }
            </div>

            <button
              appButton
              (click)="handleExport()"
              [disabled]="isExporting()"
              class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              {{ isExporting() ? 'Generating Excel...' : 'Download Expertise Pool (Excel)' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ExportPage {
  protected readonly isExporting = signal(false);
  protected readonly lastExport = signal<Date | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async handleExport(): Promise<void> {
    this.isExporting.set(true);
    this.error.set(null);
    try {
      await adminApi.exportRoster();
      this.lastExport.set(new Date());
    } catch (err) {
      this.error.set('Failed to download the Expertise Pool. Please try again.');
    } finally {
      this.isExporting.set(false);
    }
  }
}
