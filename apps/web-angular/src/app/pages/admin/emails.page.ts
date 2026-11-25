import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import { ToastService } from '../../core/toast.service';
import { adminApi } from '../../lib/api/admin.api';
import { formatDateTime } from '../../lib/utils/date';

/** What each email is, in plain words. */
const EMAIL_LABELS: Record<string, string> = {
  submission_confirmation: 'Application received',
  president_review_request: 'Endorsement request / reminder',
  president_link_expired: 'New endorsement link',
  president_reminder_applicant_notice: 'President reminded (applicant copy)',
  changes_requested: 'Returned for changes',
  endorsed: 'Endorsed',
  approved: 'Added to the pool',
  rejected: 'Not accepted',
  renewal_reminder_90d: 'Expiry reminder (90 days)',
  renewal_reminder_30d: 'Expiry reminder (30 days)',
  expired: 'Profile expired',
  applicant_edit_link: 'Editing link',
  draft_saved_link: 'Draft saved',
  applicant_view_link: 'View link',
  password_reset: 'Password reset (officer)',
  password_changed: 'Password changed (officer)',
  secretary_review_pending: 'Review request (old)',
};

/**
 * Every email the system sent or failed to send. "Needs attention" lists
 * failures not yet fixed by a later successful send; each can be retried.
 */
@Component({
  selector: 'app-emails-page',
  imports: [RouterLink],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <p class="text-text-mid mb-5">
        Emails the system has sent. If an email failed (for example the mail server was unavailable), retry it here.
      </p>

      <div class="mb-4 inline-flex rounded-lg border border-border bg-white p-1" role="tablist">
        <button
          role="tab"
          [attr.aria-selected]="failedOnly()"
          (click)="setTab(true)"
          [class]="tabClass(failedOnly())"
        >
          Needs attention
          @if (failedCount() !== null) {
            <span
              [class]="
                'ml-1.5 rounded-full px-1.5 text-[11px] ' + (failedCount()! > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100')
              "
              >{{ failedCount() }}</span
            >
          }
        </button>
        <button role="tab" [attr.aria-selected]="!failedOnly()" (click)="setTab(false)" [class]="tabClass(!failedOnly())">
          All emails
        </button>
      </div>

      <div class="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        @if (query.isLoading()) {
          <p class="p-8 text-center text-text-light">Loading…</p>
        } @else if ((query.data()?.data ?? []).length === 0) {
          <p class="p-8 text-center text-text-mid">
            {{ failedOnly() ? 'No failed emails. Everything has been delivered to the mail server.' : 'No emails yet.' }}
          </p>
        } @else {
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-border">
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Date</th>
                <th class="py-3 px-2 md:px-4 text-[12px] font-semibold text-navy uppercase">Email</th>
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">To</th>
                <th class="hidden md:table-cell py-3 px-4 text-[12px] font-semibold text-navy uppercase">Application</th>
                <th class="py-3 px-2 md:px-4 text-[12px] font-semibold text-navy uppercase">Status</th>
                <th class="py-3 px-2 md:px-4"></th>
              </tr>
            </thead>
            <tbody>
              @for (log of query.data()?.data ?? []; track log.id) {
                <tr class="border-b border-border last:border-0 align-top">
                  <td class="hidden md:table-cell py-3 px-4 text-[13px] text-text-light whitespace-nowrap">
                    {{ formatDateTime(log.createdAt) }}
                  </td>
                  <td class="py-3 px-2 md:px-4 text-[14px] text-navy font-medium">
                    {{ label(log.notificationType) }}
                    <!-- Phones: date, recipient and application under the email name. -->
                    <span class="md:hidden block text-[12px] font-normal text-text-light [overflow-wrap:anywhere]">
                      {{ formatDateTime(log.createdAt) }} · {{ log.recipientEmail }}
                      @if (log.application?.referenceNumber) {
                        · {{ log.application.referenceNumber }}
                      }
                    </span>
                  </td>
                  <td class="hidden md:table-cell py-3 px-4 text-[13px] text-text-mid [overflow-wrap:anywhere]">
                    {{ log.recipientEmail }}
                  </td>
                  <td class="hidden md:table-cell py-3 px-4 text-[13px]">
                    @if (log.application) {
                      <a [routerLink]="'/admin/applications/' + log.application.id" class="text-navy hover:text-gold hover:underline"
                        ><span class="font-mono">{{ log.application.referenceNumber || 'Draft' }}</span>
                        {{ log.application.firstName }} {{ log.application.lastName }}</a
                      >
                    } @else {
                      <span class="text-text-light">—</span>
                    }
                  </td>
                  <td class="py-3 px-2 md:px-4 text-[13px]">
                    @if (log.failedAt) {
                      <span class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11.5px] font-semibold text-red-700">Failed</span>
                      @if (log.errorMessage) {
                        <span class="mt-1 block max-w-[260px] text-[12px] text-text-light [overflow-wrap:anywhere]">{{
                          log.errorMessage
                        }}</span>
                      }
                    } @else {
                      <span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11.5px] font-semibold text-green-700">Sent</span>
                    }
                  </td>
                  <td class="py-3 px-2 md:px-4 text-right">
                    <!-- Retry from "Needs attention": in "All emails" a failure may already be fixed. -->
                    @if (failedOnly() && log.failedAt && log.applicationId) {
                      <button
                        (click)="retry(log.id)"
                        [disabled]="retrying() === log.id"
                        class="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-60"
                      >
                        {{ retrying() === log.id ? 'Sending…' : 'Retry' }}
                      </button>
                    } @else if (failedOnly() && log.failedAt) {
                      <span class="text-[12px] text-text-light">Resend from User Management</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!failedOnly() && (query.data()?.total ?? 0) > pageSize) {
            <div class="flex items-center justify-between border-t border-border px-4 py-3 text-[13px] text-text-mid">
              <span>Page {{ page() }} of {{ pages() }}</span>
              <div class="flex gap-2">
                <button
                  class="rounded border border-border px-3 py-1 disabled:opacity-50"
                  [disabled]="page() === 1"
                  (click)="page.set(page() - 1)"
                >
                  Previous
                </button>
                <button
                  class="rounded border border-border px-3 py-1 disabled:opacity-50"
                  [disabled]="page() >= pages()"
                  (click)="page.set(page() + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EmailsPage {
  private readonly queryClient = inject(QueryClient);
  private readonly toast = inject(ToastService);
  protected readonly formatDateTime = formatDateTime;
  protected readonly pageSize = 50;

  protected readonly failedOnly = signal(true);
  protected readonly page = signal(1);
  protected readonly retrying = signal<string | null>(null);

  protected readonly query = injectQuery(() => ({
    queryKey: ['notifications', this.failedOnly(), this.page()],
    queryFn: () => adminApi.listNotifications({ failedOnly: this.failedOnly(), page: this.page(), limit: this.pageSize }),
  }));
  private readonly failedQ = injectQuery(() => ({
    queryKey: ['notifications', 'failed-count'],
    queryFn: () => adminApi.listNotifications({ failedOnly: true, page: 1, limit: 1 }),
  }));
  protected readonly failedCount = () => (this.failedQ.data() as any)?.total ?? null;
  protected readonly pages = () => Math.max(1, Math.ceil(((this.query.data() as any)?.total ?? 0) / this.pageSize));

  protected label(type: string): string {
    return EMAIL_LABELS[type] ?? type.replace(/_/g, ' ');
  }

  protected tabClass(active: boolean): string {
    return `rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
      active ? 'bg-navy text-white' : 'text-navy hover:bg-navy-light'
    }`;
  }

  protected setTab(failed: boolean): void {
    this.failedOnly.set(failed);
    this.page.set(1);
  }

  protected async retry(id: string): Promise<void> {
    this.retrying.set(id);
    try {
      await adminApi.retryNotification(id);
      await this.queryClient.invalidateQueries({ queryKey: ['notifications'] });
      const stillFailing = ((this.query.data() as any)?.data ?? []).some((l: any) => l.id === id);
      this.toast.showToast(stillFailing ? 'The email failed again. Check the error and try later.' : 'Email sent.', stillFailing ? 'error' : 'success');
    } catch (err: any) {
      this.toast.showToast(err.response?.data?.message || 'The email could not be retried.', 'error');
    } finally {
      this.retrying.set(null);
    }
  }
}
