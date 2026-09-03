"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { IncomeExpenseSummary } from "@/lib/domain/reports";

function buildShareText(rangeLabel: string, from: string, to: string, summary: IncomeExpenseSummary, currency: string) {
  return [
    `Finance Tracker report — ${rangeLabel}`,
    `${formatDate(from)} – ${formatDate(to)}`,
    "",
    `Income: ${formatCurrency(summary.income, currency)}`,
    `Expense: ${formatCurrency(summary.expense, currency)}`,
    `Net: ${formatCurrency(summary.net, currency)}`,
  ].join("\n");
}

export function ShareReportButton({
  rangeLabel,
  from,
  to,
  summary,
  currency,
}: {
  rangeLabel: string;
  from: string;
  to: string;
  summary: IncomeExpenseSummary;
  currency: string;
}) {
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  async function handleShare() {
    const text = buildShareText(rangeLabel, from, to, summary, currency);

    if (navigator.share) {
      try {
        await navigator.share({ title: `Finance Tracker report — ${rangeLabel}`, text });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        toast.error("Couldn't share. Copying to clipboard instead.");
        await copyToClipboard(text);
      }
      return;
    }

    await copyToClipboard(text);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="h-3.5 w-3.5" />
      Share
    </Button>
  );
}
