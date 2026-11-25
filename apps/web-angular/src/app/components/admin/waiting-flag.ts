import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Whole days an application has been waiting for its President. */
export function daysWaiting(submittedAt: string | Date | null | undefined, now = new Date()): number {
  if (!submittedAt) return 0;
  const start = new Date(submittedAt);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

/** The President is reminded on day 3 and day 7; after that it needs a person. */
export const WAITING_WARN_DAYS = 7;
export const WAITING_ALERT_DAYS = 14;

/**
 * <span appWaitingFlag [submittedAt]="…"> — how long an application has been
 * waiting for the President: grey under 7 days, amber from 7 (both reminders
 * sent), red from 14 days.
 */
@Component({
  selector: 'span[appWaitingFlag]',
  template: `
    @if (level() !== 'info') {
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-3 w-3 shrink-0" aria-hidden="true">
        <path d="M5 3v18h2v-7h11l-2-4 2-4H7V3z" />
      </svg>
    }
    Waiting {{ days() }} {{ days() === 1 ? 'day' : 'days' }}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.title]': 'title()',
  },
})
export class WaitingFlagComponent {
  readonly submittedAt = input<string | Date | null | undefined>(null);

  protected readonly days = computed(() => daysWaiting(this.submittedAt()));
  protected readonly level = computed(() =>
    this.days() >= WAITING_ALERT_DAYS ? 'alert' : this.days() >= WAITING_WARN_DAYS ? 'warn' : 'info',
  );
  protected readonly title = computed(() =>
    this.level() === 'alert'
      ? 'Waiting for the President for 2 weeks or more. Consider contacting the association.'
      : this.level() === 'warn'
        ? 'Both automatic reminders have been sent to the President.'
        : 'Waiting for the President to endorse.',
  );
  protected readonly classes = computed(() => {
    const base = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold';
    if (this.level() === 'alert') return `${base} bg-red-100 text-red-800`;
    if (this.level() === 'warn') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-gray-100 text-gray-600`;
  });
}
