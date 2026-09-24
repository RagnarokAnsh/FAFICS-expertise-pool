import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PortalDirective } from '../../core/portal.directive';

/**
 * Lightweight checkbox-list multi-select with a popover panel —
 * components/ui/MultiSelect.tsx. Controlled: bind [value] and (valueChange).
 *
 * The popover renders in a portal with fixed positioning so it is never clipped
 * by an ancestor that scrolls/overflows (e.g. the row's `overflow-x-auto`).
 */
@Component({
  selector: 'div[appMultiSelect]',
  imports: [PortalDirective],
  template: `
    <button #btn type="button" (click)="open.set(!open())" [class]="buttonClasses()">
      <span class="truncate">{{ summary() }}</span>
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8892aa" stroke-width="2" class="shrink-0">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    @if (open() && coords(); as c) {
      <div
        appPortal
        #panel
        [style.position]="'fixed'"
        [style.top.px]="c.top"
        [style.left.px]="c.left"
        [style.width.px]="c.width"
        [style.min-width.px]="240"
        class="z-50 max-h-[240px] overflow-auto rounded-[7px] border border-border bg-white py-1 shadow-lg"
      >
        @if (max() != null) {
          <div class="px-3 py-1.5 text-[11px] text-text-muted border-b border-border">
            {{ value().length }}/{{ max() }} selected{{ atMax() ? ' — limit reached' : '' }}
          </div>
        }
        @for (opt of options(); track opt) {
          <label
            [class]="
              'flex items-center gap-2.5 px-3 py-2 text-[13px] ' +
              (!value().includes(opt) && atMax()
                ? 'cursor-not-allowed text-text-muted opacity-60'
                : 'cursor-pointer text-text hover:bg-navy-light')
            "
          >
            <input
              type="checkbox"
              class="h-[15px] w-[15px] accent-navy"
              [checked]="value().includes(opt)"
              [disabled]="!value().includes(opt) && atMax()"
              (change)="toggle(opt)"
            />
            <span>{{ opt }}</span>
          </label>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative' },
})
export class MultiSelectComponent {
  readonly options = input.required<readonly string[]>();
  readonly value = input.required<string[]>();
  readonly placeholder = input('Select…');
  readonly hasError = input(false);
  /** Optional cap on the number of selections (e.g. "top 5"). */
  readonly max = input<number | undefined>(undefined);
  readonly valueChange = output<string[]>();

  protected readonly open = signal(false);
  protected readonly coords = signal<{ top: number; left: number; width: number } | null>(null);
  private readonly btn = viewChild.required<ElementRef<HTMLButtonElement>>('btn');
  private readonly panel = viewChild<ElementRef<HTMLDivElement>>('panel');

  protected readonly atMax = computed(() => {
    const max = this.max();
    return max != null && this.value().length >= max;
  });

  protected readonly summary = computed(() => {
    const value = this.value();
    return value.length === 0 ? this.placeholder() : value.length === 1 ? value[0] : `${value.length} selected`;
  });

  protected readonly buttonClasses = computed(
    () =>
      `flex h-[40px] w-full items-center justify-between gap-2 rounded-[7px] border-[1.5px] px-3 font-sans text-[14px] text-left transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
        this.hasError() ? 'border-danger bg-[#fff5f5]' : 'border-border bg-off-white'
      } ${this.value().length === 0 ? 'text-text-muted' : 'text-text'}`,
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) return;
      this.updateCoords();
      const onDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (this.btn().nativeElement.contains(t) || this.panel()?.nativeElement.contains(t)) return;
        this.open.set(false);
      };
      const onReflow = () => this.updateCoords();
      document.addEventListener('mousedown', onDown);
      window.addEventListener('scroll', onReflow, true);
      window.addEventListener('resize', onReflow);
      onCleanup(() => {
        document.removeEventListener('mousedown', onDown);
        window.removeEventListener('scroll', onReflow, true);
        window.removeEventListener('resize', onReflow);
      });
    });
  }

  private updateCoords(): void {
    const r = this.btn().nativeElement.getBoundingClientRect();
    this.coords.set({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  protected toggle(opt: string): void {
    const value = this.value();
    const selected = value.includes(opt);
    if (!selected && this.atMax()) return; // cap reached — ignore further selections
    this.valueChange.emit(selected ? value.filter((v) => v !== opt) : [...value, opt]);
  }
}
