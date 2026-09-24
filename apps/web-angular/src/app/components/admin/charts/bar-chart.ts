import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ChartTooltipComponent, TooltipItem } from './chart-tooltip';
import {
  Rect,
  TickEntry,
  animate,
  firstLineDy,
  getBarPosition,
  getNiceTickValues,
  getRectanglePath,
  getVisibleTicks,
  getWordsByLines,
  round4,
} from './recharts-lite';

export interface BarDatum {
  label: string;
  count: number;
}

export interface BarTick {
  fontSize: number;
  fill: string;
  angle?: number;
  textAnchor?: 'start' | 'middle' | 'end';
  /** 0 shows every label; undefined uses recharts' default ('preserveEnd'). */
  interval?: 0;
}

interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderedLabel {
  key: string;
  x: number;
  y: number;
  lines: string[];
  dy: string;
  transform: string | null;
}

const X_AXIS_HEIGHT = 30;
const DEFAULT_Y_AXIS_WIDTH = 60;
const TICK_SIZE = 6;
const TICK_MARGIN = 2;
let clipId = 0;

/**
 * A recharts <ResponsiveContainer><BarChart> with one <Bar>, grid, axes and
 * tooltip — same DOM, geometry, tick placement, cursor, tooltip and grow-in
 * animation. layout 'horizontal' draws vertical bars (category X axis);
 * 'vertical' draws horizontal bars (category Y axis), like the React charts.
 */
@Component({
  selector: 'app-bar-chart',
  imports: [ChartTooltipComponent],
  template: `
    <div #container class="recharts-responsive-container" [style.height.px]="height()" style="width: 100%; min-width: 0px">
      <div style="width: 0px; overflow-x: visible">
        @if (width() > 0) {
          <div
            class="recharts-wrapper"
            [attr.width]="width()"
            [attr.height]="height()"
            [style]="{ position: 'relative', cursor: 'default', width: width() + 'px', height: height() + 'px' }"
            (mousemove)="onMouseMove($event)"
            (mouseleave)="activeIndex.set(null)"
          >
            <app-chart-tooltip
              [active]="activeIndex() !== null"
              [coordinate]="tooltipCoordinate()"
              [viewBox]="plot()"
              [label]="tooltipLabel()"
              [items]="tooltipItems()"
              [contentOverrides]="contentStyle"
            />
            <svg
              role="application"
              tabindex="0"
              class="recharts-surface"
              [attr.width]="width()"
              [attr.height]="height()"
              [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
              style="width: 100%; height: 100%; display: block"
              (focus)="onFocus()"
              (blur)="activeIndex.set(null)"
              (keydown)="onKeyDown($event)"
            >
              <title></title>
              <desc></desc>
              <g tabindex="-1" class="recharts-zIndex-layer_-100">
                <g class="recharts-cartesian-grid">
                  @if (layout() === 'horizontal') {
                    <g class="recharts-cartesian-grid-horizontal">
                      @for (t of valueTicks(); track $index) {
                        <line
                          stroke-dasharray="3 3"
                          stroke="#e5e7eb"
                          fill="none"
                          [attr.x1]="plot().x"
                          [attr.y1]="t.coordinate"
                          [attr.x2]="plot().x + plot().width"
                          [attr.y2]="t.coordinate"
                        ></line>
                      }
                    </g>
                  } @else {
                    <g class="recharts-cartesian-grid-vertical">
                      @for (t of valueTicks(); track $index) {
                        <line
                          stroke-dasharray="3 3"
                          stroke="#e5e7eb"
                          fill="none"
                          [attr.x1]="t.coordinate"
                          [attr.y1]="plot().y"
                          [attr.x2]="t.coordinate"
                          [attr.y2]="plot().y + plot().height"
                        ></line>
                      }
                    </g>
                  }
                </g>
              </g>
              <g tabindex="-1" class="recharts-zIndex-layer_-50"></g>
              <defs>
                <clipPath [attr.id]="clipPathId">
                  <rect [attr.x]="plot().x" [attr.y]="plot().y" [attr.height]="plot().height" [attr.width]="plot().width"></rect>
                </clipPath>
              </defs>
              <g tabindex="-1" class="recharts-zIndex-layer_100"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_200">
                @if (cursor(); as c) {
                  <path
                    stroke="none"
                    pointer-events="none"
                    [attr.fill]="cursorFill"
                    class="recharts-rectangle recharts-tooltip-cursor"
                    [attr.d]="c"
                  ></path>
                }
              </g>
              <g tabindex="-1" class="recharts-zIndex-layer_300">
                <g class="recharts-layer recharts-bar">
                  <g class="recharts-layer recharts-bar-rectangles">
                    <g class="recharts-layer">
                      @for (bar of drawn(); track $index; let i = $index) {
                        @if (bar.width !== 0 && bar.height !== 0) {
                          <g class="recharts-layer recharts-bar-rectangle">
                            <g class="recharts-layer recharts-inactive-bar">
                              <path
                                [attr.fill]="barColor(i)"
                                class="recharts-rectangle"
                                [attr.d]="barPath(bar)"
                              ></path>
                            </g>
                          </g>
                        }
                      }
                    </g>
                  </g>
                </g>
              </g>
              <g tabindex="-1" class="recharts-zIndex-layer_400"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_500">
                <g class="recharts-layer recharts-cartesian-axis recharts-xAxis xAxis">
                  <line
                    class="recharts-cartesian-axis-line"
                    stroke="#666"
                    fill="none"
                    [attr.x1]="plot().x"
                    [attr.y1]="plot().y + plot().height"
                    [attr.x2]="plot().x + plot().width"
                    [attr.y2]="plot().y + plot().height"
                  ></line>
                  <g class="recharts-cartesian-axis-ticks recharts-xAxis-ticks">
                    <g class="recharts-cartesian-axis-tick-lines recharts-xAxis-tick-lines">
                      @for (t of xTicks(); track $index) {
                        <g class="recharts-layer recharts-cartesian-axis-tick">
                          <line
                            class="recharts-cartesian-axis-tick-line"
                            stroke="#666"
                            fill="none"
                            [attr.x1]="t.coordinate"
                            [attr.y1]="plot().y + plot().height + tickSize"
                            [attr.x2]="t.coordinate"
                            [attr.y2]="plot().y + plot().height"
                          ></line>
                        </g>
                      }
                    </g>
                  </g>
                </g>
                <g class="recharts-layer recharts-cartesian-axis recharts-yAxis yAxis">
                  <line
                    class="recharts-cartesian-axis-line"
                    stroke="#666"
                    fill="none"
                    [attr.x1]="plot().x"
                    [attr.y1]="plot().y"
                    [attr.x2]="plot().x"
                    [attr.y2]="plot().y + plot().height"
                  ></line>
                  <g class="recharts-cartesian-axis-ticks recharts-yAxis-ticks">
                    <g class="recharts-cartesian-axis-tick-lines recharts-yAxis-tick-lines">
                      @for (t of yTicks(); track $index) {
                        <g class="recharts-layer recharts-cartesian-axis-tick">
                          <line
                            class="recharts-cartesian-axis-tick-line"
                            stroke="#666"
                            fill="none"
                            [attr.x1]="plot().x - tickSize"
                            [attr.y1]="t.coordinate"
                            [attr.x2]="plot().x"
                            [attr.y2]="t.coordinate"
                          ></line>
                        </g>
                      }
                    </g>
                  </g>
                </g>
              </g>
              <g tabindex="-1" class="recharts-zIndex-layer_600"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_1000"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_1100"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_1200"></g>
              <g tabindex="-1" class="recharts-zIndex-layer_2000">
                <g class="recharts-cartesian-axis-tick-labels recharts-xAxis-tick-labels">
                  @for (label of xLabels(); track label.key) {
                    <g class="recharts-layer recharts-cartesian-axis-tick-label">
                      <text
                        stroke="none"
                        [attr.font-size]="xTickStyle().fontSize"
                        [attr.transform]="label.transform"
                        [attr.x]="label.x"
                        [attr.y]="label.y"
                        class="recharts-text recharts-cartesian-axis-tick-value"
                        [attr.text-anchor]="xTickStyle().textAnchor ?? 'middle'"
                        [attr.fill]="xTickStyle().fill"
                      >
                        @for (line of label.lines; track $index; let first = $first) {
                          <tspan [attr.x]="label.x" [attr.dy]="first ? label.dy : '1em'">{{ line }}</tspan>
                        }
                      </text>
                    </g>
                  }
                </g>
                <g class="recharts-cartesian-axis-tick-labels recharts-yAxis-tick-labels">
                  @for (label of yLabels(); track label.key) {
                    <g class="recharts-layer recharts-cartesian-axis-tick-label">
                      <text
                        stroke="none"
                        [attr.font-size]="yTickStyle().fontSize"
                        [attr.x]="label.x"
                        [attr.y]="label.y"
                        class="recharts-text recharts-cartesian-axis-tick-value"
                        text-anchor="end"
                        [attr.fill]="yTickStyle().fill"
                      >
                        @for (line of label.lines; track $index; let first = $first) {
                          <tspan [attr.x]="label.x" [attr.dy]="first ? label.dy : '1em'">{{ line }}</tspan>
                        }
                      </text>
                    </g>
                  }
                </g>
              </g>
            </svg>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class BarChartComponent {
  readonly data = input.required<BarDatum[]>();
  readonly height = input.required<number>();
  readonly layout = input<'horizontal' | 'vertical'>('horizontal');
  readonly margin = input.required<{ top: number; right: number; bottom: number; left: number }>();
  /** <Bar fill>. Leave unset when every bar gets its own colour via `cellFills`. */
  readonly barFill = input<string | undefined>(undefined);
  /** <Cell fill> per bar. */
  readonly cellFills = input<string[] | undefined>(undefined);
  readonly radius = input.required<[number, number, number, number]>();
  readonly categoryTick = input.required<BarTick>();
  readonly valueTick = input.required<BarTick>();
  /** YAxis width when the category axis is on the left (layout 'vertical'). */
  readonly categoryAxisWidth = input(DEFAULT_Y_AXIS_WIDTH);
  /** Tooltip formatter output name, e.g. 'Experts'. */
  readonly tooltipName = input.required<string>();

  protected readonly tickSize = TICK_SIZE;
  protected readonly cursorFill = 'rgba(13,34,64,0.05)';
  protected readonly contentStyle = { 'font-size': '12px', 'border-radius': '6px', border: '1px solid #e5e7eb' };
  protected readonly clipPathId = `recharts${++clipId}-clip`;
  protected readonly width = signal(0);
  protected readonly activeIndex = signal<number | null>(null);
  private readonly mouse = signal<{ x: number; y: number } | null>(null);
  protected readonly drawn = signal<BarRect[]>([]);
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  private readonly yAxisWidth = computed(() =>
    this.layout() === 'vertical' ? this.categoryAxisWidth() : DEFAULT_Y_AXIS_WIDTH,
  );

  protected readonly plot = computed<Rect>(() => {
    const m = this.margin();
    const yw = this.yAxisWidth();
    return {
      x: m.left + yw,
      y: m.top,
      width: this.width() - m.left - yw - m.right,
      height: this.height() - m.top - m.bottom - X_AXIS_HEIGHT,
    };
  });

  /** Nice ticks for the number axis (domain [0, auto], 5 ticks, integers only). */
  private readonly niceTicks = computed(() => {
    const max = Math.max(0, ...this.data().map((d) => d.count));
    return getNiceTickValues([0, max], 5, false);
  });

  private scaleValue(value: number): number {
    const ticks = this.niceTicks();
    const d0 = ticks[0];
    const d1 = ticks[ticks.length - 1];
    const plot = this.plot();
    const ratio = d1 === d0 ? 0 : (value - d0) / (d1 - d0);
    return this.layout() === 'horizontal' ? plot.y + plot.height - ratio * plot.height : plot.x + ratio * plot.width;
  }

  private readonly bandSize = computed(() => {
    const plot = this.plot();
    const n = this.data().length || 1;
    return (this.layout() === 'horizontal' ? plot.width : plot.height) / n;
  });

  private bandStart(index: number): number {
    const plot = this.plot();
    return (this.layout() === 'horizontal' ? plot.x : plot.y) + index * this.bandSize();
  }

  protected readonly valueTicks = computed<TickEntry[]>(() =>
    this.niceTicks().map((value) => ({ value, coordinate: this.scaleValue(value) })),
  );

  private readonly categoryTicks = computed<TickEntry[]>(() =>
    this.data().map((d, i) => ({ value: d.label, coordinate: this.bandStart(i) + this.bandSize() / 2 })),
  );

  protected readonly xTickStyle = computed(() =>
    this.layout() === 'horizontal' ? this.categoryTick() : this.valueTick(),
  );
  protected readonly yTickStyle = computed(() =>
    this.layout() === 'horizontal' ? this.valueTick() : this.categoryTick(),
  );

  /** Ticks each axis shows after recharts' interval logic. */
  protected readonly xTicks = computed(() => {
    const ticks = this.layout() === 'horizontal' ? this.categoryTicks() : this.valueTicks();
    const style = this.xTickStyle();
    return getVisibleTicks(ticks, {
      interval: style.interval,
      orientation: 'bottom',
      chartSize: { width: this.width(), height: this.height() },
      fontSize: `${style.fontSize}px`,
      angle: style.angle,
    });
  });

  protected readonly yTicks = computed(() => {
    const ticks = this.layout() === 'horizontal' ? this.valueTicks() : this.categoryTicks();
    const style = this.yTickStyle();
    return getVisibleTicks(ticks, {
      interval: style.interval,
      orientation: 'left',
      chartSize: { width: this.width(), height: this.height() },
      fontSize: `${style.fontSize}px`,
    });
  });

  protected readonly xLabels = computed<RenderedLabel[]>(() => {
    const plot = this.plot();
    const style = this.xTickStyle();
    const y = plot.y + plot.height + TICK_SIZE + TICK_MARGIN;
    return this.xTicks().map((t) => {
      const x = t.tickCoord ?? t.coordinate;
      const lines = getWordsByLines(`${t.value}`, plot.width);
      return {
        key: `${t.value}-${t.coordinate}`,
        x,
        y,
        lines,
        dy: firstLineDy(lines.length, 'start'),
        transform: style.angle ? `rotate(${style.angle}, ${x}, ${y})` : null,
      };
    });
  });

  protected readonly yLabels = computed<RenderedLabel[]>(() => {
    const plot = this.plot();
    const x = plot.x - TICK_SIZE - TICK_MARGIN;
    return this.yTicks().map((t) => {
      const lines = getWordsByLines(`${t.value}`, this.yAxisWidth());
      return {
        key: `${t.value}-${t.coordinate}`,
        x,
        y: t.tickCoord ?? t.coordinate,
        lines,
        dy: firstLineDy(lines.length, 'middle'),
        transform: null,
      };
    });
  });

  /** Final bar rectangles (recharts rounds them to 4 decimals). */
  private readonly bars = computed<BarRect[]>(() => {
    const { offset, size } = getBarPosition(this.bandSize());
    const base = this.scaleValue(0);
    return this.data().map((d, i) => {
      const start = this.bandStart(i) + offset;
      const valuePos = this.scaleValue(d.count);
      if (this.layout() === 'horizontal') {
        return { x: round4(start), y: round4(valuePos), width: round4(size), height: round4(base - valuePos) };
      }
      return { x: round4(base), y: round4(start), width: round4(valuePos - base), height: round4(size) };
    });
  });

  protected readonly cursor = computed(() => {
    const index = this.activeIndex();
    if (index === null) return null;
    const plot = this.plot();
    const band = round4(this.bandSize());
    const start = round4(this.bandStart(index));
    return this.layout() === 'horizontal'
      ? `M ${start},${plot.y + 0.5} h ${band} v ${plot.height - 1} h ${-band} Z`
      : `M ${plot.x + 0.5},${start} h ${plot.width - 1} v ${band} h ${-(plot.width - 1)} Z`;
  });

  protected readonly tooltipCoordinate = signal<{ x: number; y: number } | null>(null);
  protected readonly tooltipLabel = computed(() => {
    const index = this.activeIndex();
    return index === null ? '' : (this.data()[index]?.label ?? '');
  });
  protected readonly tooltipItems = computed<TooltipItem[]>(() => {
    const index = this.activeIndex();
    if (index === null) return [];
    const datum = this.data()[index];
    if (!datum) return [];
    return [{ name: this.tooltipName(), value: datum.count ?? 0, color: this.barFill() }];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // ResponsiveContainer: follow the container's width.
    afterNextRender(() => {
      const el = this.container().nativeElement;
      const observer = new ResizeObserver((entries) => this.width.set(entries[0].contentRect.width));
      observer.observe(el);
      this.width.set(el.getBoundingClientRect().width);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Bars grow in over 400ms (and morph between data changes).
    let cancel: () => void = () => undefined;
    let previous: BarRect[] | null = null;
    let previousData: BarDatum[] | null = null;
    effect(() => {
      const target = this.bars();
      const data = this.data();
      untracked(() => {
        if (this.width() <= 0) return;
        cancel();
        // Only a data change animates; a resize just re-lays out.
        if (previous && previousData === data) {
          this.drawn.set(target);
          previous = target;
          return;
        }
        const prev = previous;
        const layout = this.layout();
        cancel = animate(400, 0, (t) => this.drawn.set(interpolateBars(prev, target, t, layout)));
        previous = target;
        previousData = data;
      });
    });
    destroyRef.onDestroy(() => cancel());

    // Keep the tooltip anchored (and remembered while hidden) like recharts.
    effect(() => {
      const index = this.activeIndex();
      const mouse = this.mouse();
      if (index === null) return;
      const center = this.bandStart(index) + this.bandSize() / 2;
      const plot = this.plot();
      untracked(() => {
        const fallback = { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
        const m = mouse ?? fallback;
        this.tooltipCoordinate.set(this.layout() === 'horizontal' ? { x: center, y: m.y } : { x: m.x, y: center });
      });
    });
  }

  protected barColor(index: number): string | null {
    return this.cellFills()?.[index] ?? this.barFill() ?? null;
  }

  protected barPath(bar: BarRect): string {
    return getRectanglePath(bar.x, bar.y, bar.width, bar.height, this.radius());
  }

  protected onMouseMove(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const plot = this.plot();
    const inside = x >= plot.x && x <= plot.x + plot.width && y >= plot.y && y <= plot.y + plot.height;
    const count = this.data().length;
    if (!inside || !count) {
      this.activeIndex.set(null);
      return;
    }
    const pos = this.layout() === 'horizontal' ? x - plot.x : y - plot.y;
    const index = Math.min(count - 1, Math.max(0, Math.floor(pos / this.bandSize())));
    this.mouse.set({ x, y });
    this.activeIndex.set(index);
  }

  protected onFocus(): void {
    if (this.data().length) {
      this.mouse.set(null);
      this.activeIndex.set(0);
    }
  }

  protected onKeyDown(e: KeyboardEvent): void {
    const count = this.data().length;
    const current = this.activeIndex();
    if (current === null || !count) return;
    if (e.key === 'ArrowRight') {
      this.activeIndex.set(Math.min(count - 1, current + 1));
    } else if (e.key === 'ArrowLeft') {
      this.activeIndex.set(Math.max(0, current - 1));
    }
  }
}

/** recharts Bar renderRectanglesWithAnimation. */
function interpolateBars(
  prev: BarRect[] | null,
  target: BarRect[],
  t: number,
  layout: 'horizontal' | 'vertical',
): BarRect[] {
  return target.map((entry, index) => {
    const before = prev?.[index];
    if (before) {
      return {
        x: before.x + (entry.x - before.x) * t,
        y: before.y + (entry.y - before.y) * t,
        width: before.width + (entry.width - before.width) * t,
        height: before.height + (entry.height - before.height) * t,
      };
    }
    if (layout === 'horizontal') {
      const h = entry.height * t;
      return { ...entry, y: entry.y + entry.height - h, height: h };
    }
    return { ...entry, width: entry.width * t };
  });
}
