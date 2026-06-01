'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { label: string; count: number }[];
}

const COLORS = ['#0D2240', '#C8973A', '#4a7fb5', '#8ba3c1'];

const LABEL_MAP: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
  other: 'Other',
};

export function GenderDonutChart({ data }: Props) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-64 text-text-light text-sm">No data yet</div>;
  }

  const formatted = data.map((d) => ({ ...d, name: LABEL_MAP[d.label] ?? d.label }));
  const total = formatted.reduce((s, d) => s + d.count, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={formatted}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(v: number) => [v, 'Experts']}
          />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 30 }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-navy">{total}</div>
          <div className="text-xs text-text-light">Total</div>
        </div>
      </div>
    </div>
  );
}
