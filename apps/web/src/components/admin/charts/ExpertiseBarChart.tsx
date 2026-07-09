'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { navyRamp } from './chartColors';

interface Props {
  data: { label: string; count: number }[];
}

export function ExpertiseBarChart({ data }: Props) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-64 text-text-light text-sm">No data yet</div>;
  }

  const colors = navyRamp(data.length);

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={200}
          tick={{ fontSize: 11, fill: '#374151' }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(13,34,64,0.05)' }}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(v) => [v ?? 0, 'Experts']}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
