import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BarChartComponent, BarDatum } from './bar-chart';
import { CATEGORICAL, navyRamp } from './chart-colors';
import { PieChartComponent } from './pie-chart';

interface CountDatum {
  label: string;
  count: number;
}

const EMPTY = `<div class="flex items-center justify-center h-64 text-text-light text-sm">No data yet</div>`;

/** components/admin/charts/DistributionPieChart.tsx */
@Component({
  selector: 'app-distribution-pie-chart',
  imports: [PieChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <div class="relative">
        <app-pie-chart
          [data]="pieData()"
          [height]="height()"
          [innerRadius]="58"
          [outerRadius]="92"
          [legendFontSize]="11"
          [formatter]="formatter()"
          [contentStyle]="contentStyle"
          [wrapperStyle]="wrapperStyle"
        />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="padding-bottom: 40px">
          <div class="text-center">
            <div class="text-2xl font-bold text-navy">{{ total() }}</div>
            <div class="text-xs text-text-light">Total</div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DistributionPieChartComponent {
  readonly data = input.required<CountDatum[]>();
  /** Optional map from raw label → display name */
  readonly labelMap = input<Record<string, string> | undefined>(undefined);
  /** Optional map from raw label → fixed slice color (falls back to palette) */
  readonly colorMap = input<Record<string, string> | undefined>(undefined);
  readonly height = input(260);

  protected readonly contentStyle = {
    'font-size': '12px',
    'border-radius': '6px',
    border: '1px solid #e5e7eb',
    background: '#fff',
  };
  protected readonly wrapperStyle = { 'z-index': '50', outline: 'none' };

  protected readonly pieData = computed(() =>
    this.data().map((d, i) => ({
      name: this.labelMap()?.[d.label] ?? d.label,
      value: d.count,
      fill: this.colorMap()?.[d.label] ?? CATEGORICAL[i % CATEGORICAL.length],
    })),
  );
  protected readonly total = computed(() => this.data().reduce((s, d) => s + d.count, 0));
  protected readonly formatter = computed(() => {
    const total = this.total();
    return (v: number, n: string): [string, string] => [
      `${v} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`,
      n,
    ];
  });
}

const GENDER_COLORS = ['#0D2240', '#C8973A', '#4a7fb5', '#8ba3c1'];
const GENDER_LABEL_MAP: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
  other: 'Other',
};

/** components/admin/charts/GenderDonutChart.tsx */
@Component({
  selector: 'app-gender-donut-chart',
  imports: [PieChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <div class="relative">
        <app-pie-chart
          [data]="pieData()"
          [height]="260"
          [innerRadius]="70"
          [outerRadius]="110"
          [legendFontSize]="12"
          [formatter]="formatter"
          [contentStyle]="contentStyle"
        />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="padding-bottom: 30px">
          <div class="text-center">
            <div class="text-2xl font-bold text-navy">{{ total() }}</div>
            <div class="text-xs text-text-light">Total</div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class GenderDonutChartComponent {
  readonly data = input.required<CountDatum[]>();
  protected readonly contentStyle = { 'font-size': '12px', 'border-radius': '6px', border: '1px solid #e5e7eb' };
  protected readonly formatter = (v: number): [number, string] => [v ?? 0, 'Experts'];
  protected readonly pieData = computed(() =>
    this.data().map((d, i) => ({
      name: GENDER_LABEL_MAP[d.label] ?? d.label,
      value: d.count,
      fill: GENDER_COLORS[i % GENDER_COLORS.length],
    })),
  );
  protected readonly total = computed(() => this.data().reduce((s, d) => s + d.count, 0));
}

/** components/admin/charts/ExpertiseBarChart.tsx */
@Component({
  selector: 'app-expertise-bar-chart',
  imports: [BarChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <app-bar-chart
        [data]="data()"
        [height]="height()"
        layout="vertical"
        [margin]="{ top: 4, right: 24, left: 4, bottom: 4 }"
        [cellFills]="colors()"
        [radius]="[0, 3, 3, 0]"
        [categoryTick]="{ fontSize: 11, fill: '#374151' }"
        [valueTick]="{ fontSize: 12, fill: '#6b7280' }"
        [categoryAxisWidth]="200"
        tooltipName="Experts"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ExpertiseBarChartComponent {
  readonly data = input.required<BarDatum[]>();
  protected readonly colors = computed(() => navyRamp(this.data().length));
  protected readonly height = computed(() => Math.max(280, this.data().length * 36));
}

/** components/admin/charts/GradeBarChart.tsx */
@Component({
  selector: 'app-grade-bar-chart',
  imports: [BarChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <app-bar-chart
        [data]="data()"
        [height]="280"
        [margin]="{ top: 4, right: 16, left: 0, bottom: 16 }"
        barFill="#0D2240"
        [radius]="[3, 3, 0, 0]"
        [categoryTick]="{ fontSize: 12, fill: '#374151' }"
        [valueTick]="{ fontSize: 12, fill: '#6b7280' }"
        tooltipName="Positions"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class GradeBarChartComponent {
  readonly data = input.required<BarDatum[]>();
}

/** components/admin/charts/LanguageBarChart.tsx */
@Component({
  selector: 'app-language-bar-chart',
  imports: [BarChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <app-bar-chart
        [data]="top()"
        [height]="280"
        [margin]="{ top: 4, right: 16, left: 0, bottom: 60 }"
        barFill="#C8973A"
        [radius]="[3, 3, 0, 0]"
        [categoryTick]="{ fontSize: 11, fill: '#374151', angle: -40, textAnchor: 'end', interval: 0 }"
        [valueTick]="{ fontSize: 12, fill: '#6b7280' }"
        tooltipName="Experts"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class LanguageBarChartComponent {
  readonly data = input.required<BarDatum[]>();
  protected readonly top = computed(() => this.data().slice(0, 15));
}

/** components/admin/charts/NationalityBarChart.tsx */
@Component({
  selector: 'app-nationality-bar-chart',
  imports: [BarChartComponent],
  template: `
    @if (!data().length) {
      ${EMPTY}
    } @else {
      <app-bar-chart
        [data]="data()"
        [height]="280"
        [margin]="{ top: 4, right: 16, left: 0, bottom: 60 }"
        barFill="#0D2240"
        [radius]="[3, 3, 0, 0]"
        [categoryTick]="{ fontSize: 11, fill: '#374151', angle: -40, textAnchor: 'end', interval: 0 }"
        [valueTick]="{ fontSize: 12, fill: '#6b7280' }"
        tooltipName="Experts"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class NationalityBarChartComponent {
  readonly data = input.required<BarDatum[]>();
}
