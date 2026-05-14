// src/components/charts/CategoryPieChart.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  data: any[];
  nameKey: string; // 예: "category" (아크릴, 지류)
  dataKey: string; // 예: "value" (매출 비중)
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function CategoryPieChart({ data, nameKey, dataKey }: Props) {
  return (
    <div className="w-full h-64 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey={dataKey} nameKey={nameKey}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`${Number(value).toLocaleString()}원`, "매출"]} 
            />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}