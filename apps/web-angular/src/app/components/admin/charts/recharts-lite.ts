/**
 * The small slice of recharts 3.8 behaviour the dashboard charts rely on,
 * reimplemented from the library's source so the Angular charts produce the
 * same geometry: nice axis ticks, text measurement and wrapping, tick
 * visibility (the default `preserveEnd` interval), bar sizing, bar/sector
 * paths, tooltip placement and the CSS `ease` animation curve.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** recharts rounds rendered coordinates to 4 decimal places. */
export const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

// ── Nice ticks (recharts util/scale/getNiceTickValues) ──────────────────────

/** Math.ceil guarded against floating-point noise (recharts uses decimal.js). */
const ceilSafe = (n: number): number => Math.ceil(n - 1e-9);

function getDigitCount(value: number): number {
  return value === 0 ? 1 : Math.floor(Math.log10(Math.abs(value))) + 1;
}

function getAdaptiveStep(roughStep: number, allowDecimals: boolean, correctionFactor: number): number {
  if (roughStep <= 0) return 0;
  const digitCount = getDigitCount(roughStep);
  const digitCountValue = Math.pow(10, digitCount);
  const stepRatio = roughStep / digitCountValue;
  const stepRatioScale = digitCount !== 1 ? 0.05 : 0.1;
  const amendStepRatio = (ceilSafe(stepRatio / stepRatioScale) + correctionFactor) * stepRatioScale;
  const formatStep = amendStepRatio * digitCountValue;
  return allowDecimals ? formatStep : ceilSafe(formatStep);
}

function getTickOfSingleValue(value: number, tickCount: number, allowDecimals: boolean): number[] {
  let step = 1;
  let middle = value;
  if (!Number.isInteger(value) && allowDecimals) {
    const absVal = Math.abs(value);
    if (absVal < 1) {
      step = Math.pow(10, getDigitCount(value) - 1);
      middle = Math.floor(middle / step) * step;
    } else if (absVal > 1) {
      middle = Math.floor(value);
    }
  } else if (value === 0) {
    middle = Math.floor((tickCount - 1) / 2);
  } else if (!allowDecimals) {
    middle = Math.floor(value);
  }
  const middleIndex = Math.floor((tickCount - 1) / 2);
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push(middle + (i - middleIndex) * step);
  }
  return ticks;
}

function calculateStep(
  min: number,
  max: number,
  tickCount: number,
  allowDecimals: boolean,
  correctionFactor = 0,
): { step: number; tickMin: number; tickMax: number } {
  if (!Number.isFinite((max - min) / (tickCount - 1))) {
    return { step: 0, tickMin: 0, tickMax: 0 };
  }
  const step = getAdaptiveStep((max - min) / (tickCount - 1), allowDecimals, correctionFactor);
  let middle: number;
  if (min <= 0 && max >= 0) {
    middle = 0;
  } else {
    middle = (min + max) / 2;
    middle = middle - (middle % step);
  }
  let belowCount = ceilSafe((middle - min) / step);
  let upCount = ceilSafe((max - middle) / step);
  const scaleCount = belowCount + upCount + 1;
  if (scaleCount > tickCount) {
    return calculateStep(min, max, tickCount, allowDecimals, correctionFactor + 1);
  }
  if (scaleCount < tickCount) {
    upCount = max > 0 ? upCount + (tickCount - scaleCount) : upCount;
    belowCount = max > 0 ? belowCount : belowCount + (tickCount - scaleCount);
  }
  return { step, tickMin: middle - belowCount * step, tickMax: middle + upCount * step };
}

export function getNiceTickValues([min, max]: [number, number], tickCount = 5, allowDecimals = true): number[] {
  const count = Math.max(tickCount, 2);
  const [cormin, cormax] = min > max ? [max, min] : [min, max];
  if (cormin === cormax) {
    return getTickOfSingleValue(cormin, tickCount, allowDecimals);
  }
  const { step, tickMin, tickMax } = calculateStep(cormin, cormax, count, allowDecimals);
  const values: number[] = [];
  const end = tickMax + 0.1 * step;
  for (let num = tickMin, i = 0; num < end && i < 100000; num += step, i++) {
    values.push(num);
  }
  return min > max ? values.reverse() : values;
}

// ── Text measurement (recharts util/DOMUtils getStringSize) ─────────────────

const SPAN_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  top: '-20000px',
  left: '0px',
  padding: '0px',
  margin: '0px',
  border: 'none',
  whiteSpace: 'pre',
};
const sizeCache = new Map<string, Size>();

/**
 * Measure a string with a hidden span appended to <body>, as recharts does, so
 * it inherits the page font. With no font size given the body default (16px)
 * applies — recharts measures tick-label word wrapping exactly that way.
 */
export function getStringSize(text: string | number, style: { fontSize?: string; letterSpacing?: string } = {}): Size {
  const key = `${text}|${style.fontSize ?? ''}|${style.letterSpacing ?? ''}`;
  const cached = sizeCache.get(key);
  if (cached) return cached;
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  Object.assign(span.style, SPAN_STYLE);
  if (style.fontSize) span.style.fontSize = style.fontSize;
  if (style.letterSpacing) span.style.letterSpacing = style.letterSpacing;
  span.textContent = `${text}`;
  document.body.appendChild(span);
  const rect = span.getBoundingClientRect();
  span.remove();
  const result = { width: rect.width, height: rect.height };
  sizeCache.set(key, result);
  return result;
}

// ── Word wrapping (recharts component/Text) ─────────────────────────────────

const BREAKING_SPACES = new RegExp('[ \f\n\r\t\v\u2028\u2029]+');

/** Split `text` into lines no wider than `lineWidth`, measured like recharts' <Text>. */
export function getWordsByLines(text: string, lineWidth: number | undefined): string[] {
  const words = text.split(BREAKING_SPACES);
  if (!lineWidth) {
    return [words.join(' ')];
  }
  const spaceWidth = getStringSize(String.fromCharCode(0xa0)).width;
  const lines: { words: string[]; width: number }[] = [];
  for (const word of words) {
    const width = getStringSize(word).width;
    const current = lines[lines.length - 1];
    if (current && current.width + width + spaceWidth < lineWidth) {
      current.words.push(word);
      current.width += width + spaceWidth;
    } else {
      lines.push({ words: [word], width });
    }
  }
  return lines.map((line) => line.words.join(' '));
}

/** The `dy` of a <Text>'s first tspan for a given vertical anchor. */
export function firstLineDy(lineCount: number, verticalAnchor: 'start' | 'middle' | 'end'): string {
  if (verticalAnchor === 'start') return '0.71em';
  if (verticalAnchor === 'middle') return `${((lineCount - 1) / 2) * -1 + 0.71 / 2}em`;
  return `${(lineCount - 1) * -1}em`;
}

// ── Tick visibility (recharts cartesian/getTicks, interval="preserveEnd") ───

export interface TickEntry {
  value: string | number;
  coordinate: number;
  tickCoord?: number;
  isShow?: boolean;
}

function getAngledRectangleWidth({ width, height }: Size, angle = 0): number {
  const normalizedAngle = angle % 180;
  const angleRadians = (normalizedAngle * Math.PI) / 180;
  const angleThreshold = Math.atan(height / width);
  const angledWidth =
    angleRadians > angleThreshold && angleRadians < Math.PI - angleThreshold
      ? height / Math.sin(angleRadians)
      : width / Math.cos(angleRadians);
  return Math.abs(angledWidth);
}

function isVisible(sign: number, tickPosition: number, getSize: () => number, start: number, end: number): boolean {
  if (sign * tickPosition < sign * start || sign * tickPosition > sign * end) {
    return false;
  }
  const size = getSize();
  return sign * (tickPosition - (sign * size) / 2 - start) >= 0 && sign * (tickPosition + (sign * size) / 2 - end) <= 0;
}

/**
 * Which ticks an axis shows. `interval` 0 shows every tick; otherwise the
 * default 'preserveEnd' rule hides labels that would overlap. `chartSize` is the
 * whole chart (recharts uses the chart's own box as the axis viewBox).
 */
export function getVisibleTicks(
  ticks: TickEntry[],
  opts: {
    interval?: number;
    orientation: 'bottom' | 'left';
    chartSize: Size;
    fontSize: string;
    angle?: number;
    minTickGap?: number;
  },
): TickEntry[] {
  if (!ticks.length) return [];
  if (opts.interval === 0) {
    return ticks;
  }
  const minTickGap = opts.minTickGap ?? 5;
  const sizeKey = opts.orientation === 'bottom' ? 'width' : 'height';
  const getTickSize = (entry: TickEntry) => {
    const size = getStringSize(entry.value, { fontSize: opts.fontSize, letterSpacing: 'normal' });
    return sizeKey === 'width' ? getAngledRectangleWidth(size, opts.angle) : size.height;
  };
  const sign = ticks.length >= 2 ? Math.sign(ticks[1].coordinate - ticks[0].coordinate) || 1 : 1;
  const isWidth = sizeKey === 'width';
  const { width, height } = opts.chartSize;
  const start = sign === 1 ? 0 : isWidth ? width : height;
  let end = sign === 1 ? (isWidth ? width : height) : 0;

  const result = ticks.map((t) => ({ ...t }));
  const len = result.length;
  for (let i = len - 1; i >= 0; i--) {
    const entry = result[i];
    let size: number | undefined;
    const getSize = () => (size ??= getTickSize(entry));
    if (i === len - 1) {
      const gap = sign * (entry.coordinate + (sign * getSize()) / 2 - end);
      entry.tickCoord = gap > 0 ? entry.coordinate - gap * sign : entry.coordinate;
    } else {
      entry.tickCoord = entry.coordinate;
    }
    if (isVisible(sign, entry.tickCoord, getSize, start, end)) {
      end = entry.tickCoord - sign * (getSize() / 2 + minTickGap);
      entry.isShow = true;
    }
  }
  return result.filter((t) => t.isShow);
}

// ── Bars (recharts util/ChartUtils getBarPosition + shape/Rectangle) ────────

/** Offset and size of a single bar series inside a category band (barCategoryGap 10%). */
export function getBarPosition(bandSize: number): { offset: number; size: number } {
  const offset = bandSize * 0.1;
  let size = bandSize - 2 * offset;
  if (size > 1) {
    size = Math.trunc(size);
  }
  return { offset, size };
}

/** SVG path for a rectangle with per-corner radii [tl, tr, br, bl] (recharts getRectanglePath). */
export function getRectanglePath(x: number, y: number, width: number, height: number, radius: number[]): string {
  const maxRadius = Math.min(Math.abs(width) / 2, Math.abs(height) / 2);
  const ySign = height >= 0 ? 1 : -1;
  const xSign = width >= 0 ? 1 : -1;
  const clockWise = (height >= 0 && width >= 0) || (height < 0 && width < 0) ? 1 : 0;
  if (maxRadius > 0) {
    const r = radius.map((v) => (v > maxRadius ? maxRadius : v));
    let path = `M${x},${y + ySign * r[0]}`;
    if (r[0] > 0) path += `A ${r[0]},${r[0]},0,0,${clockWise},${x + xSign * r[0]},${y}`;
    path += `L ${x + width - xSign * r[1]},${y}`;
    if (r[1] > 0) path += `A ${r[1]},${r[1]},0,0,${clockWise},\n        ${x + width},${y + ySign * r[1]}`;
    path += `L ${x + width},${y + height - ySign * r[2]}`;
    if (r[2] > 0) path += `A ${r[2]},${r[2]},0,0,${clockWise},\n        ${x + width - xSign * r[2]},${y + height}`;
    path += `L ${x + xSign * r[3]},${y + height}`;
    if (r[3] > 0) path += `A ${r[3]},${r[3]},0,0,${clockWise},\n        ${x},${y + height - ySign * r[3]}`;
    return path + 'Z';
  }
  return `M ${x},${y} h ${width} v ${height} h ${-width} Z`;
}

// ── Pie sectors (recharts util/PolarUtils + shape/Sector) ───────────────────

const RADIAN = Math.PI / 180;

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return { x: cx + Math.cos(-RADIAN * angle) * radius, y: cy + Math.sin(-RADIAN * angle) * radius };
}

function getDeltaAngle(startAngle: number, endAngle: number): number {
  const sign = Math.sign(endAngle - startAngle);
  return sign * Math.min(Math.abs(endAngle - startAngle), 359.999);
}

export function getSectorPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const angle = getDeltaAngle(startAngle, endAngle);
  const tempEndAngle = startAngle + angle;
  const p = (pt: { x: number; y: number }) => `${round4(pt.x)},${round4(pt.y)}`;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, tempEndAngle);
  let path = `M ${p(outerStart)}
    A ${outerRadius},${outerRadius},0,
    ${+(Math.abs(angle) > 180)},${+(startAngle > tempEndAngle)},
    ${p(outerEnd)}
  `;
  if (innerRadius > 0) {
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, tempEndAngle);
    path += `L ${p(innerEnd)}
            A ${innerRadius},${innerRadius},0,
            ${+(Math.abs(angle) > 180)},${+(startAngle <= tempEndAngle)},
            ${p(innerStart)} Z`;
  } else {
    path += `L ${cx},${cy} Z`;
  }
  return path;
}

export interface SectorGeometry {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  value: number;
}

/** Sector angles for a pie that starts at 0° and sweeps 360° counter-clockwise (recharts computePieSectors). */
export function computeSectors(values: number[], paddingAngle: number): SectorGeometry[] {
  const deltaAngle = 360;
  const notZeroItemCount = values.filter((v) => v !== 0).length;
  const totalPaddingAngle = notZeroItemCount * paddingAngle;
  const realTotalAngle = deltaAngle - totalPaddingAngle;
  const sum = values.reduce((s, v) => s + v, 0);
  if (sum <= 0) return [];
  const sectors: SectorGeometry[] = [];
  let prevEnd = 0;
  values.forEach((value, i) => {
    const percent = value / sum;
    const startAngle = i ? prevEnd + paddingAngle * (value !== 0 ? 1 : 0) : 0;
    const endAngle = startAngle + percent * realTotalAngle;
    sectors.push({ startAngle, endAngle, midAngle: (startAngle + endAngle) / 2, value });
    prevEnd = endAngle;
  });
  return sectors;
}

// ── Tooltip placement (recharts util/tooltip/translate) ─────────────────────

export function getTooltipTranslate(
  coordinate: { x: number; y: number },
  tooltip: Size,
  viewBox: Rect,
  offset = 10,
): { x: number; y: number; className: string } {
  const axis = (key: 'x' | 'y', tooltipDimension: number, viewBoxDimension: number) => {
    const negative = coordinate[key] - tooltipDimension - offset;
    const positive = coordinate[key] + offset;
    const viewBoxKey = viewBox[key];
    if (positive + tooltipDimension > viewBoxKey + viewBoxDimension) {
      return Math.max(negative, viewBoxKey);
    }
    return Math.max(positive, viewBoxKey);
  };
  const x = axis('x', tooltip.width, viewBox.width);
  const y = axis('y', tooltip.height, viewBox.height);
  const className = [
    'recharts-tooltip-wrapper',
    x >= coordinate.x ? 'recharts-tooltip-wrapper-right' : 'recharts-tooltip-wrapper-left',
    y >= coordinate.y ? 'recharts-tooltip-wrapper-bottom' : 'recharts-tooltip-wrapper-top',
  ].join(' ');
  return { x, y, className };
}

// ── Animation (recharts' JS animations use the CSS `ease` curve) ────────────

/** cubic-bezier(0.25, 0.1, 0.25, 1) */
export function ease(t: number): number {
  const x1 = 0.25,
    y1 = 0.1,
    x2 = 0.25,
    y2 = 1;
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const sampleDX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const err = sampleX(s) - t;
    if (Math.abs(err) < 1e-6) break;
    const d = sampleDX(s);
    if (Math.abs(d) < 1e-6) break;
    s -= err / d;
  }
  return sampleY(Math.min(1, Math.max(0, s)));
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Runs `step(progress)` from 0 to 1 over `duration` ms after `delay` ms. Returns a cancel function. */
export function animate(duration: number, delay: number, step: (progress: number) => void): () => void {
  if (prefersReducedMotion()) {
    step(1);
    return () => undefined;
  }
  let frame = 0;
  let start: number | null = null;
  const tick = (now: number) => {
    if (start === null) start = now;
    const elapsed = now - start - delay;
    const t = elapsed <= 0 ? 0 : Math.min(1, elapsed / duration);
    step(ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  step(0);
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
