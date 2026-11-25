import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// ── Card matching the demo's `.report-card` ──────────────────────────────────
/**
 * <div appReportCard heading="…">. An element with the `reportCardAction`
 * attribute is projected next to the heading (the React `action` prop).
 */
@Component({
  selector: 'div[appReportCard]',
  template: `
    @if (heading()) {
      <div class="mb-3.5 flex items-center justify-between border-b border-border pb-2.5">
        <h4 class="text-[11px] font-bold uppercase tracking-[0.05em] text-navy">{{ heading() }}</h4>
        <ng-content select="[reportCardAction]" />
      </div>
    }
    <div [class]="bodyClassName()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rounded-theme border border-border bg-white p-5 shadow-theme' },
})
export class ReportCardComponent {
  readonly heading = input<string | undefined>(undefined);
  readonly bodyClassName = input('');
}

// ── Section header matching the demo's `.sec-head` ───────────────────────────
/** <div appSectionHeader [heading] [subtitle]> with a projected [sectionAction]. */
@Component({
  selector: 'div[appSectionHeader]',
  template: `
    <div>
      @if (heading()) {
        <h3 class="font-serif text-[16px] font-bold text-navy">{{ heading() }}</h3>
      }
      @if (subtitle()) {
        <p class="text-[13px] text-text-muted">{{ subtitle() }}</p>
      }
    </div>
    <ng-content select="[sectionAction]" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mb-4 flex items-center justify-between gap-4' },
})
export class SectionHeaderComponent {
  readonly heading = input<string | undefined>(undefined);
  readonly subtitle = input<string | undefined>(undefined);
}

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-[#eaf3de] text-success',
  submitted: 'bg-[#fff8e6] text-[#c07a00]',
  endorsed: 'bg-navy-light text-navy-mid',
  under_review: 'bg-navy-light text-navy-mid',
  changes_requested: 'bg-[#fff8e6] text-[#c07a00]',
  rejected: 'bg-[#fdecea] text-danger',
  expired: 'bg-off-white text-text-muted border border-border',
  draft: 'bg-off-white text-text-muted border border-border',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Active in Pool',
  submitted: 'Awaiting President',
  endorsed: 'Endorsed',
  under_review: 'Under Review',
  changes_requested: 'Returned for Changes',
  rejected: 'Rejected',
  expired: 'Expired',
  draft: 'Draft',
};

/** <span appStatusBadge [status]> — StatusBadge from components/admin/ui.tsx. */
@Component({
  selector: 'span[appStatusBadge]',
  template: '{{ label() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()] ?? this.status());
  protected readonly classes = computed(
    () =>
      `inline-block rounded-[10px] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] ${
        STATUS_STYLES[this.status()] ?? 'bg-off-white text-text-muted'
      }`,
  );
}

// ── Inline SVG icons (1px stroke, currentColor) ──────────────────────────────
/** ICONS from components/admin/ui.tsx — <app-admin-icon name="users" />. */
@Component({
  selector: 'app-admin-icon',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="h-10 w-10">
      @switch (name()) {
        @case ('users') {
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        }
        @case ('grid') {
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AdminIconComponent {
  readonly name = input.required<'users' | 'clock' | 'globe' | 'grid'>();
}
