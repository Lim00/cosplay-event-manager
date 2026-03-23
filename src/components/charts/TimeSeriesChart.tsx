// src/components/charts/TimeSeriesChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any[];
  xKey: string; // 예: "time" (10:00, 11:00)
  yKey: string; // 예: "amount" (매출액)
  color?: string;
}

export default function TimeSeriesChart({ data, xKey, yKey, color = "#8b5cf6" }: Props) {
  return (
    <div className="w-full h-64 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#9ca3af" }} tickMargin={10} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={(value) => `${(value / 10000)}만`} axisLine={false} tickLine={false} />
          <Tooltip 
            formatter={(value: any) => [`${Number(value).toLocaleString()}원`, "매출"]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}