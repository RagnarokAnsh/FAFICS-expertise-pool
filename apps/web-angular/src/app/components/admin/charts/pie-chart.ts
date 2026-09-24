import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ChartTooltipComponent, TooltipItem } from './chart-tooltip';
import { Rect, SectorGeometry, animate, computeSectors, getSectorPath, polarToCartesian } from './recharts-lite';

export interface PieDatum {
  name: string;
  value: number;
  fill: string;
}

interface RenderedSector extends SectorGeometry {
  index: number;
  d: string;
}

const MARGIN = 5;
const PADDING_ANGLE = 2;

/**
 * A recharts <ResponsiveContainer><PieChart><Pie/><Tooltip/><Legend/></PieChart>
 * donut, reproduced with the same DOM, geometry, legend (sorted by name, as
 * recharts 3 does), tooltip and sweep-in animation.
 */
@Component({
  selector: 'app-pie-chart',
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
          >
            <app-chart-tooltip
              [active]="activeIndex() !== null"
              [coordinate]="tooltipCoordinate()"
              [viewBox]="plot()"
              [items]="tooltipItems()"
              [contentOverrides]="contentStyle()"
              [wrapperOverrides]="wrapperStyle()"
            />
            <div
              #legend
              class="recharts-legend-wrapper"
              [style]="{
                position: 'absolute',
                width: width() - 2 * margin + 'px',
                height: 'auto',
                left: margin + 'px',
                bottom: margin + 'px',
                'font-size': legendFontSize() + 'px',
              }"
            >
              <ul class="recharts-default-legend" style="padding: 0px; margin: 0px; text-align: center">
                @for (item of legendItems(); track item.name; let i = $index) {
                  <li [class]="'recharts-legend-item legend-item-' + i" style="display: inline-block; margin-right: 10px">
                    <svg
                      [attr.aria-label]="item.name + ' legend icon'"
                      class="recharts-surface"
                      width="10"
                      height="10"
                      viewBox="0 0 32 32"
                      style="display: inline-block; vertical-align: middle; margin-right: 4px"
                    >
                      <title></title>
                      <desc></desc>
                      <path
                        [attr.fill]="item.fill"
                        cx="16"
                        cy="16"
                        class="recharts-symbols"
                        transform="translate(16, 16)"
                        d="M16,0A16,16,0,1,1,-16,0A16,16,0,1,1,16,0"
                      ></path></svg
                    ><span class="recharts-legend-item-text" [style.color]="item.fill">{{ item.name }}</span>
                  </li>
                }
              </ul>
            </div>
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
              <g class="recharts-layer recharts-pie" tabindex="0">
                <g class="recharts-layer">
                  @for (sector of renderedSectors(); track sector.index) {
                    <g class="recharts-layer recharts-pie-sector" tabindex="-1">
                      <g class="recharts-layer recharts-shape">
                        <path
                          [attr.fill]="data()[sector.index].fill"
                          stroke="#fff"
                          [attr.name]="data()[sector.index].name"
                          tabindex="-1"
                          class="recharts-sector"
                          [attr.d]="sector.d"
                          (mouseenter)="activeIndex.set(sector.index)"
                          (mouseleave)="activeIndex.set(null)"
                        ></path>
                      </g>
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
export class PieChartComponent {
  readonly data = input.required<PieDatum[]>();
  readonly height = input(260);
  readonly innerRadius = input.required<number>();
  readonly outerRadius = input.required<number>();
  readonly legendFontSize = input(11);
  /** Tooltip formatter: (value, name) => [value, name], as in the React chart. */
  readonly formatter = input<(value: number, name: string) => [string | number, string]>((v, n) => [v, n]);
  readonly contentStyle = input<Record<string, string>>({});
  readonly wrapperStyle = input<Record<string, string>>({});

  protected readonly margin = MARGIN;
  protected readonly width = signal(0);
  private readonly legendHeight = signal(0);
  protected readonly activeIndex = signal<number | null>(null);
  /** Angles currently drawn (animated towards the computed sectors). */
  private readonly drawn = signal<SectorGeometry[]>([]);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly legend = viewChild<ElementRef<HTMLDivElement>>('legend');

  protected readonly plot = computed<Rect>(() => ({
    x: MARGIN,
    y: MARGIN,
    width: this.width() - 2 * MARGIN,
    height: this.height() - 2 * MARGIN - this.legendHeight(),
  }));
  private readonly center = computed(() => {
    const plot = this.plot();
    return { cx: plot.x + plot.width / 2, cy: plot.y + plot.height / 2 };
  });

  private readonly sectors = computed(() => computeSectors(this.data().map((d) => d.value), PADDING_ANGLE));

  protected readonly legendItems = computed(() =>
    [...this.data()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  );

  protected readonly renderedSectors = computed<RenderedSector[]>(() => {
    const { cx, cy } = this.center();
    return this.drawn()
      .map((s, index) => ({
        ...s,
        index,
        d: getSectorPath(cx, cy, this.innerRadius(), this.outerRadius(), s.startAngle, s.endAngle),
      }))
      .filter((s) => s.startAngle !== s.endAngle);
  });

  protected readonly tooltipCoordinate = signal<{ x: number; y: number } | null>(null);

  protected readonly tooltipItems = computed<TooltipItem[]>(() => {
    const index = this.activeIndex();
    if (index === null) return [];
    const datum = this.data()[index];
    if (!datum) return [];
    const [value, name] = this.formatter()(datum.value, datum.name);
    return [{ name, value, color: datum.fill }];
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

    // The legend's rendered height is taken out of the pie's area (recharts' offset).
    afterRenderEffect(() => {
      this.legendItems();
      this.width();
      const legend = this.legend()?.nativeElement;
      if (!legend) return;
      untracked(() => {
        const h = legend.getBoundingClientRect().height;
        if (Math.abs(h - this.legendHeight()) > 0.01) this.legendHeight.set(h);
      });
    });

    // Sweep the sectors in (and between data changes), 1.5s after a 400ms delay.
    let cancel: () => void = () => undefined;
    let previous: SectorGeometry[] | null = null;
    effect(() => {
      const target = this.sectors();
      untracked(() => {
        cancel();
        const prev = previous;
        if (prev && sameAngles(prev, target)) return;
        cancel = animate(1500, 400, (t) => this.drawn.set(interpolateSectors(prev, target, t)));
        previous = target;
      });
    });
    destroyRef.onDestroy(() => cancel());

    // Tooltip anchor: the active sector's midpoint (it stays put when hidden).
    effect(() => {
      const index = this.activeIndex();
      if (index === null) return;
      const sector = this.sectors()[index];
      if (!sector) return;
      const { cx, cy } = this.center();
      const middleRadius = (this.innerRadius() + this.outerRadius()) / 2;
      untracked(() => this.tooltipCoordinate.set(polarToCartesian(cx, cy, middleRadius, sector.midAngle)));
    });
  }

  protected onFocus(): void {
    if (this.data().length) this.activeIndex.set(0);
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

function sameAngles(a: SectorGeometry[], b: SectorGeometry[]): boolean {
  return a.length === b.length && a.every((s, i) => s.startAngle === b[i].startAngle && s.endAngle === b[i].endAngle);
}

/** recharts Pie renderSectorsWithAnimation: sectors grow from the previous angles (or from zero). */
function interpolateSectors(prev: SectorGeometry[] | null, target: SectorGeometry[], t: number): SectorGeometry[] {
  const step: SectorGeometry[] = [];
  let curAngle = target[0]?.startAngle ?? 0;
  target.forEach((entry, index) => {
    const before = prev?.[index];
    const paddingAngle = index > 0 ? PADDING_ANGLE : 0;
    const span = entry.endAngle - entry.startAngle;
    const from = before ? before.endAngle - before.startAngle : 0;
    const delta = from + (span - from) * t;
    const startAngle = curAngle + paddingAngle;
    const endAngle = curAngle + delta + paddingAngle;
    step.push({ ...entry, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 });
    curAngle = endAngle;
  });
  return step;
}
