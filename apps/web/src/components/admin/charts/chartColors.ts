// Shared, brand-aligned chart palette so every chart reads as one system.
// Brand anchors: navy #0D2240, gold #C8973A.

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const rgbToHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const lerp = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Sequential single-hue ramp from deep navy (highest) to light steel blue
 * (lowest). Adjacent bars differ subtly, so ordered magnitude reads smoothly
 * instead of an abrupt gold-vs-navy split.
 */
export function navyRamp(n: number): string[] {
  const start = hexToRgb('#0D2240'); // deep navy — highest
  const end = hexToRgb('#93AAC6'); // light steel blue — lowest
  if (n <= 1) return ['#0D2240'];
  return Array.from({ length: n }, (_, i) => rgbToHex(lerp(start, end, i / (n - 1))));
}

/**
 * Categorical palette tuned for maximum distinguishability between adjacent
 * pie slices. Navy + gold lead (brand), followed by well-separated hues.
 */
export const CATEGORICAL = [
  '#0D2240', // navy
  '#C8973A', // gold
  '#2E8B8B', // teal
  '#C0504D', // terracotta
  '#6A8D3A', // olive green
  '#7B5AA6', // purple
  '#D97706', // orange
  '#3E6CA6', // blue
  '#B4478F', // magenta
  '#4B9E6B', // emerald
  '#8A6D2F', // bronze
  '#5A6B8C', // slate
];
