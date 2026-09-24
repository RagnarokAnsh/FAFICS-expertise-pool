import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** <span appBadge [status]="…"> — components/ui/Badge.tsx. */
@Component({
  selector: 'span[appBadge]',
  template: '{{ label() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class BadgeComponent {
  readonly status = input.required<string>();

  protected readonly label = computed(() => this.status().replace('_', ' '));

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
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${bg} ${text}`;
  });
}
