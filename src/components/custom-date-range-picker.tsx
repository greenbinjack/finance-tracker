"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CustomDateRangePicker({
  catType,
  initialFrom,
  initialTo,
}: {
  catType: string;
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function apply() {
    if (!from || !to || from > to) return;
    router.push(`/reports?range=custom&from=${from}&to=${to}&catType=${catType}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="report-from" className="text-xs text-muted-foreground">
          From
        </label>
        <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-to" className="text-xs text-muted-foreground">
          To
        </label>
        <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button type="button" size="sm" onClick={apply} disabled={!from || !to || from > to}>
        Apply
      </Button>
    </div>
  );
}
