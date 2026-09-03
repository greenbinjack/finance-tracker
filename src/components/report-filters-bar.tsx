"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export function ReportFiltersBar({
  accounts,
  events,
}: {
  accounts: { id: string; name: string }[];
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId") ?? ALL;
  const eventId = searchParams.get("eventId") ?? ALL;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const accountLabel = (v: string) => accounts.find((a) => a.id === v)?.name ?? "All accounts";
  const eventLabel = (v: string) => events.find((e) => e.id === v)?.name ?? "All events";

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={accountId} onValueChange={(v) => updateParam("accountId", v ?? ALL)}>
        <SelectTrigger className="w-[9.5rem]">
          <SelectValue placeholder="All accounts">{accountLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={eventId} onValueChange={(v) => updateParam("eventId", v ?? ALL)}>
        <SelectTrigger className="w-[9.5rem]">
          <SelectValue placeholder="All events">{eventLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All events</SelectItem>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
