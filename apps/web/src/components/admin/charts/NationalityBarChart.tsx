'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { label: string; count: number }[];
}

export function NationalityBarChart({ data }: Props) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-64 text-text-light text-sm">No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#374151' }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(13,34,64,0.05)' }}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(v: number) => [v, 'Experts']}
        />
        <Bar dataKey="count" fill="#0D2240" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
