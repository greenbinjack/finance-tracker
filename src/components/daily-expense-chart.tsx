"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { DailyExpensePoint } from "@/lib/domain/reports";

export function DailyExpenseChart({ data, currency }: { data: DailyExpensePoint[]; currency?: string }) {
  const hasSpending = data.some((d) => d.amount > 0);
  if (!hasSpending) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No expenses in the last 30 days.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={48}
            tickFormatter={(v: number) => formatCurrency(v, currency)}
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
            formatter={(value) => [formatCurrency(Number(value), currency), "Spent"]}
          />
          <Bar
            dataKey="amount"
            name="Expense"
            fill="var(--destructive)"
            radius={[2, 2, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
