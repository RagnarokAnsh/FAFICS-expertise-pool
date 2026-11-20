import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { formatDateTime } from '../../lib/utils/date';

interface AuditLog {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

/** components/admin/AuditTimeline.tsx */
@Component({
  selector: 'app-audit-timeline',
  imports: [JsonPipe],
  template: `
    @if (!logs() || logs()!.length === 0) {
      <div class="text-sm text-text-light">No timeline events available.</div>
    } @else {
      <!-- Title on its own line, then the time, so narrow cards don't squeeze the title. -->
      <div class="relative border-l-2 border-gray-200 ml-3 mt-1">
        @for (log of logs(); track log.id) {
          <div class="mb-5 last:mb-0 ml-6 relative">
            <div
              [class]="
                'absolute -left-[31px] top-3.5 w-[14px] h-[14px] rounded-full border-2 border-white shadow-sm ' +
                getColor(log.action)
              "
            ></div>
            <div class="bg-white border border-border p-3 rounded shadow-sm text-sm">
              <div class="font-semibold text-navy capitalize break-words">{{ actionLabel(log.action) }}</div>
              <div class="text-xs text-text-light mt-0.5 mb-1.5">{{ formatDateTime(log.createdAt) }}</div>
              <div class="text-text-mid text-[13px] break-words">
                By: <span class="break-all">{{ log.actorEmail }}</span> ({{ log.actorRole }})
              </div>
              @if (log.metadata && hasKeys(log.metadata)) {
                <div>
                  <button (click)="toggleExpand(log.id)" class="text-xs text-gold font-medium hover:underline focus:outline-none">
                    {{ expanded()[log.id] ? 'Hide Details' : 'View Details' }}
                  </button>
                  @if (expanded()[log.id]) {
                    <pre class="mt-2 bg-gray-50 p-2 rounded text-[11px] text-text-mid overflow-x-auto border border-gray-100">{{
                      log.metadata | json
                    }}</pre>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AuditTimelineComponent {
  readonly logs = input<AuditLog[] | null | undefined>(undefined);
  protected readonly expanded = signal<Record<string, boolean>>({});
  protected readonly formatDateTime = formatDateTime;

  protected toggleExpand(id: string): void {
    this.expanded.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  protected getColor(action: string): string {
    if (action.includes('approve') || action.includes('endorsed')) return 'bg-green-500';
    if (action.includes('reject')) return 'bg-red-500';
    if (action.includes('changes')) return 'bg-amber-500';
    if (action.includes('note')) return 'bg-navy';
    if (action.includes('submit')) return 'bg-blue-500';
    return 'bg-gray-400';
  }

  protected actionLabel(action: string): string {
    return action.replace(/[._]/g, ' ');
  }

  protected hasKeys(value: Record<string, any>): boolean {
    return Object.keys(value).length > 0;
  }
}
