import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting President',
  changes_requested: 'Returned for Changes',
  endorsed: 'Endorsed',
  under_review: 'Under Review',
  approved: 'Active in Pool',
  rejected: 'Rejected',
  expired: 'Expired',
};

/** <span appBadge [status]="…"> — components/ui/Badge.tsx. */
@Component({
  selector: 'span[appBadge]',
  template: '{{ label() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class BadgeComponent {
  readonly status = input.required<string>();

  /** Same wording as the dashboard and filters. */
  protected readonly label = computed(
    () => {
      const s = this.status();
      const fallback = s.replace(/_/g, ' ');
      return STATUS_LABELS[s.toLowerCase()] ?? fallback.charAt(0).toUpperCase() + fallback.slice(1);
    },
  );

  protected readonly classes = computed(() => {
    const normalized = this.status().toLowerCase();
    let bg = 'bg-gray-100';
    let text = 'text-gray-800';
    switch (normalized) {
      case 'draft':
        bg = 'bg-gray-100';
        text = 'text-gray-800';
        break;
      case 'submitted':
        bg = 'bg-blue-100';
        text = 'text-blue-800';
        break;
      case 'endorsed':
        bg = 'bg-purple-100';
        text = 'text-purple-800';
        break;
      case 'changes_requested':
        bg = 'bg-amber-100';
        text = 'text-amber-800';
        break;
      case 'under_review':
        bg = 'bg-indigo-100';
        text = 'text-indigo-800';
        break;
      case 'approved':
        bg = 'bg-green-100';
        text = 'text-green-800';
        break;
      case 'rejected':
        bg = 'bg-red-100';
        text = 'text-red-800';
        break;
      case 'expired':
        bg = 'bg-gray-200';
        text = 'text-gray-600';
        break;
    }
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`;
  });
}
