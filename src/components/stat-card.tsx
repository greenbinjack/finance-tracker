"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/count-up";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  amount,
  icon,
  tone = "default",
  delay = 0,
  hero = false,
}: {
  label: string;
  amount: number;
  icon: ReactNode;
  tone?: "default" | "positive" | "negative";
  delay?: number;
  /** The dashboard's headline figure — larger type and a subtle tone-matched wash to anchor visual hierarchy. */
  hero?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "overflow-hidden",
          hero &&
            tone === "positive" &&
            "bg-gradient-to-br from-emerald-500/[0.07] via-card to-card",
          hero &&
            tone === "negative" &&
            "bg-gradient-to-br from-rose-500/[0.07] via-card to-card",
          hero && tone === "default" && "bg-gradient-to-br from-primary/[0.06] via-card to-card",
        )}
      >
        <CardContent className={cn("flex items-center justify-between", hero ? "p-5" : "p-4")}>
          <div className="min-w-0">
            <p className={cn("text-muted-foreground", hero ? "text-sm" : "text-xs")}>{label}</p>
            <p
              className={cn(
                "font-semibold tabular-nums tracking-tight",
                hero ? "text-4xl" : "text-xl",
                tone === "positive" && "text-emerald-600 dark:text-emerald-400",
                tone === "negative" && "text-rose-600 dark:text-rose-400",
              )}
            >
              <CountUp value={amount} formatter={(n) => formatCurrency(n)} />
            </p>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full ring-1",
              hero ? "h-12 w-12" : "h-10 w-10",
              tone === "positive" &&
                "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
              tone === "negative" &&
                "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-400",
              tone === "default" && "bg-muted text-muted-foreground ring-foreground/5",
            )}
          >
            {icon}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
