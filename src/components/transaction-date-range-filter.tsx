"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TransactionDateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);

  function apply() {
    if (from && to && from > to) return;
    const params = new URLSearchParams(searchParams);
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilter = Boolean(urlFrom || urlTo);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="history-from" className="text-xs text-muted-foreground">
          From
        </label>
        <Input id="history-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[9.5rem]" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="history-to" className="text-xs text-muted-foreground">
          To
        </label>
        <Input id="history-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[9.5rem]" />
      </div>
      <Button type="button" size="sm" onClick={apply} disabled={Boolean(from && to && from > to)}>
        Apply
      </Button>
      {hasActiveFilter && (
        <Button type="button" size="icon" variant="ghost" onClick={clear} aria-label="Clear date filter">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
