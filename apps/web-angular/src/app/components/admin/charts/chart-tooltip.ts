import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Rect, Size, getTooltipTranslate, prefersReducedMotion } from './recharts-lite';

export interface TooltipItem {
  name: string;
  value: string | number;
  color?: string;
}

/** recharts' <Tooltip> wrapper + DefaultTooltipContent, rendered with the same markup and styles. */
@Component({
  selector: 'app-chart-tooltip',
  template: `
    <div #wrapper tabindex="-1" [class]="wrapperClass()" [style]="wrapperStyle()">
      <div class="recharts-default-tooltip" role="status" aria-live="assertive" [style]="contentStyle()">
        <p class="recharts-tooltip-label" style="margin: 0px">{{ active() ? label() : '' }}</p>
        @if (active() && items().length) {
          <ul class="recharts-tooltip-item-list" style="padding: 0px; margin: 0px">
            @for (item of items(); track $index) {
              <li
                class="recharts-tooltip-item"
                [style]="{ display: 'block', 'padding-top': '4px', 'padding-bottom': '4px', color: item.color || '#000' }"
              ><span class="recharts-tooltip-item-name">{{ item.name }}</span><span class="recharts-tooltip-item-separator"> : </span><span class="recharts-tooltip-item-value">{{ item.value }}</span><span class="recharts-tooltip-item-unit"></span></li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ChartTooltipComponent {
  readonly active = input(false);
  readonly coordinate = input<{ x: number; y: number } | null>(null);
  /** The chart's plot area — the tooltip is kept inside it. */
  readonly viewBox = input.required<Rect>();
  readonly label = input<string>('');
  readonly items = input<TooltipItem[]>([]);
  /** recharts `contentStyle` (merged over the default content style). */
  readonly contentOverrides = input<Record<string, string>>({});
  /** recharts `wrapperStyle`. */
  readonly wrapperOverrides = input<Record<string, string>>({});

  private readonly wrapper = viewChild.required<ElementRef<HTMLDivElement>>('wrapper');
  /** Last measured size of the tooltip box (recharts' lastBoundingBox). */
  private readonly box = signal<Size>({ width: -1, height: -1 });
  private readonly reducedMotion = prefersReducedMotion();

  private readonly translate = computed(() => {
    const coordinate = this.coordinate();
    const box = this.box();
    if (!coordinate || box.width <= 0 || box.height <= 0) return null;
    return getTooltipTranslate(coordinate, box, this.viewBox());
  });

  protected readonly wrapperClass = computed(() => this.translate()?.className ?? 'recharts-tooltip-wrapper');

  protected readonly wrapperStyle = computed(() => {
    const translate = this.translate();
    const style: Record<string, string> = {};
    if (this.active() && !this.reducedMotion) {
      style['transition'] = 'transform 400ms ease';
    }
    if (translate) {
      style['transform'] = `translate(${translate.x}px, ${translate.y}px)`;
    }
    style['pointer-events'] = 'none';
    style['position'] = 'absolute';
    style['top'] = '0px';
    style['left'] = '0px';
    style['visibility'] = this.active() && this.items().length ? 'visible' : 'hidden';
    return { ...style, ...this.wrapperOverrides() };
  });

  protected readonly contentStyle = computed(() => ({
    margin: '0px',
    padding: '10px',
    'background-color': '#fff',
    border: '1px solid #ccc',
    'white-space': 'nowrap',
    ...this.contentOverrides(),
  }));

  constructor() {
    // Measure the rendered box after every content change, like recharts'
    // useLayoutEffect, and only react to real size changes.
    afterRenderEffect(() => {
      this.active();
      this.items();
      this.label();
      untracked(() => {
        const rect = this.wrapper().nativeElement.getBoundingClientRect();
        const last = this.box();
        if (Math.abs(rect.width - last.width) > 1 || Math.abs(rect.height - last.height) > 1) {
          this.box.set({ width: rect.width, height: rect.height });
        }
      });
    });
  }
}
