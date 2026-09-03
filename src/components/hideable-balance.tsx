"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A per-account balance, masked by default — tap to reveal. Just a display preference (no password), same as a banking app's "hide balance" eye toggle. */
export function HideableBalance({ amount, currency }: { amount: number; currency?: string }) {
  const [revealed, setRevealed] = useState(false);
  const positive = amount >= 0;

  return (
    <button
      type="button"
      onClick={() => setRevealed((prev) => !prev)}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tabular-nums",
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      {revealed ? formatCurrency(amount, currency) : "••••••"}
      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </button>
  );
}
