"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdownSlice } from "@/lib/domain/reports";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

export function CategoryBreakdownChart({
  data,
  currency,
  emptyMessage = "Nothing in this period.",
}: {
  data: CategoryBreakdownSlice[];
  currency?: string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const rowHeight = 34;

  return (
    <div style={{ width: "100%", height: data.length * rowHeight + 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          {/* 15% headroom past the max value so the longest label never touches
              the plot edge and gets clipped — see marks-and-anatomy.md "measure first". */}
          <XAxis type="number" hide domain={[0, (max: number) => max * 1.15]} />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--popover-foreground)" }}
            formatter={(value, _name, item) => [
              `${formatCurrency(Number(value), currency)} (${item.payload.percent.toFixed(0)}%)`,
              "Spent",
            ]}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
            ))}
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(value) => formatCurrency(Number(value), currency)}
              style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
