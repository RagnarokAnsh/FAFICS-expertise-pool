import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import { ButtonComponent } from '../../components/ui/button';
import { adminApi } from '../../lib/api/admin.api';
import { formatDate } from '../../lib/utils/date';

/** app/admin/expiring/page.tsx */
@Component({
  selector: 'app-expiring-page',
  imports: [ButtonComponent],
  template: `
    @if (query.isLoading()) {
      <div class="p-8 text-text-light">Loading expiring profiles...</div>
    } @else {
      <div class="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p class="text-text-mid">Profiles expiring within the next 90 days.</p>
          </div>
          <button appButton (click)="handleSendReminder(allIds())" [disabled]="applications().length === 0 || isSending()">
            {{ isSending() ? 'Sending...' : 'Send All Reminders' }}
          </button>
        </div>

        @if (message(); as m) {
          <div
            [class]="
              'mb-6 p-4 rounded text-sm ' +
              (m.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200')
            "
          >
            {{ m.text }}
          </div>
        }

        @if (applications().length === 0) {
          <div class="bg-white border border-border p-8 rounded-lg text-center text-text-mid">
            No profiles are expiring in the next 90 days.
          </div>
        } @else {
          <div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 border-b border-border">
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Association</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Country</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Approved Date</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Expiry Date</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Days Left</th>
                    <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (app of applications(); track app.id) {
                    @let daysLeft = calculateDaysLeft(app.expiresAt);
                    <tr class="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                      <td class="py-3 px-4 text-[14px] text-navy font-semibold">{{ fullName(app) }}</td>
                      <td class="py-3 px-4 text-[14px] text-text-mid">{{ app.associationName }}</td>
                      <td class="py-3 px-4 text-[14px] text-text-mid">{{ app.associationCountry }}</td>
                      <td class="py-3 px-4 text-[14px] text-text-light">{{ formatDate(app.approvedAt) }}</td>
                      <td class="py-3 px-4 text-[14px] text-navy font-medium">{{ formatDate(app.expiresAt) }}</td>
                      <td class="py-3 px-4">
                        <span [class]="'inline-block px-2.5 py-1 rounded-md text-[12px] font-bold ' + getDaysLeftColor(daysLeft)"
                          >{{ daysLeft }} days</span
                        >
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button
                          (click)="handleSendReminder([app.id])"
                          [disabled]="isSending()"
                          class="text-[12px] font-semibold text-gold hover:text-gold-hover hover:underline disabled:opacity-50"
                        >
                          Send Reminder
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ExpiringPage {
  private readonly queryClient = inject(QueryClient);
  protected readonly isSending = signal(false);
  protected readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  protected readonly formatDate = formatDate;

  protected readonly query = injectQuery(() => ({
    queryKey: ['expiring-applications'],
    queryFn: adminApi.getExpiring,
  }));

  protected readonly applications = computed<any[]>(() => this.query.data() || []);
  protected readonly allIds = computed(() => this.applications().map((a: any) => a.id));

  protected async handleSendReminder(ids: string[]): Promise<void> {
    this.isSending.set(true);
    this.message.set(null);
    try {
      await adminApi.sendReminders(ids);
      this.message.set({ type: 'success', text: `Sent ${ids.length} reminder(s) successfully.` });
      this.queryClient.invalidateQueries({ queryKey: ['expiring-applications'] });
    } catch (err: any) {
      this.message.set({ type: 'error', text: err.response?.data?.message || 'Failed to send reminders.' });
    } finally {
      this.isSending.set(false);
    }
  }

  protected calculateDaysLeft(expiresAt: string): number {
    const diffTime = Math.abs(new Date(expiresAt).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  protected getDaysLeftColor(days: number): string {
    if (days < 30) return 'text-red-600 bg-red-50 border border-red-200';
    if (days <= 60) return 'text-amber-600 bg-amber-50 border border-amber-200';
    return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
  }

  protected fullName(app: any): string {
    return [app.firstName, app.lastName].filter(Boolean).join(' ');
  }
}
