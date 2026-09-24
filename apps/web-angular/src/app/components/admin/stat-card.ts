import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type Accent = 'navy' | 'gold' | 'success' | 'pending';

const ACCENT_BAR: Record<Accent, string> = {
  navy: 'bg-navy',
  gold: 'bg-gold',
  success: 'bg-success',
  pending: 'bg-[#c07a00]',
};

/**
 * components/admin/StatCard.tsx (kept for parity — not currently used by any
 * page). Project an icon with the `statIcon` attribute.
 */
@Component({
  selector: 'app-stat-card',
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #card>
      <div
        class="relative h-full overflow-hidden rounded-theme border border-border bg-white p-5 shadow-theme transition-shadow group-hover:shadow-md"
      >
        <div [class]="'absolute inset-x-0 top-0 h-[3px] ' + accentBar()"></div>
        @if (hasIcon()) {
          <div class="pointer-events-none absolute right-3.5 top-3.5 text-navy opacity-[0.07]">
            <ng-content select="[statIcon]" />
          </div>
        }
        <div class="mb-1 font-serif text-[34px] font-bold leading-none text-navy">{{ value() }}</div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">{{ label() }}</div>
        @if (sub()) {
          <div class="mt-2 text-[11px] text-text-muted">{{ sub() }}</div>
        }
      </div>
    </ng-template>

    @if (href()) {
      <a [routerLink]="href()" class="group block h-full"><ng-container *ngTemplateOutlet="card" /></a>
    } @else {
      <div class="h-full"><ng-container *ngTemplateOutlet="card" /></div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly accent = input<Accent>('navy');
  readonly sub = input<string | undefined>(undefined);
  readonly hasIcon = input(false);
  readonly href = input<string | undefined>(undefined);
  protected readonly accentBar = computed(() => ACCENT_BAR[this.accent()]);
}
