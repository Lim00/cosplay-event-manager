// src/components/charts/RankBarChart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  data: any[];
  xKey: string; // 예: "name" (상품명)
  yKey: string; // 예: "sales" (판매량)
}

const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

export default function RankBarChart({ data, xKey, yKey }: Props) {
  return (
    <div className="w-full h-64 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis dataKey={xKey} type="category" width={100} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{ fill: '#f3f4f6' }}
            formatter={(value: any) => [`${Number(value).toLocaleString()}개`, "판매량"]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
            />
          <Bar dataKey={yKey} radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}