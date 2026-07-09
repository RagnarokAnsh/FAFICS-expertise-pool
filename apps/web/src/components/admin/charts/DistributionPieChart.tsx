'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CATEGORICAL } from './chartColors';

interface Props {
  data: { label: string; count: number }[];
  /** Optional map from raw label → display name */
  labelMap?: Record<string, string>;
  height?: number;
}

const COLORS = CATEGORICAL;

export function DistributionPieChart({ data, labelMap, height = 260 }: Props) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-64 text-text-light text-sm">No data yet</div>;
  }

  const formatted = data.map((d) => ({ ...d, name: labelMap?.[d.label] ?? d.label }));
  const total = formatted.reduce((s, d) => s + d.count, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={formatted}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={92}
            paddingAngle={2}
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 50, outline: 'none' }}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}
            formatter={(v, n) => [`${v} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`, n]}
          />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 40 }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-navy">{total}</div>
          <div className="text-xs text-text-light">Total</div>
        </div>
      </div>
    </div>
  );
}
