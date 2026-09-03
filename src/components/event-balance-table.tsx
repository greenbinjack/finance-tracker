import { CircleDollarSign } from "lucide-react";
import { SettleTransferDialog } from "@/components/settle-transfer-dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Amounts within a cent of zero are treated as settled — a trip average
// almost never divides to an exact cent (e.g. 100 / 3).
const SETTLED_EPSILON = 0.01;

export interface BalanceRow {
  participantId: string | null;
  name: string;
  balance: number;
}

export function EventBalanceTable({
  eventId,
  rows,
  average,
  currency,
}: {
  eventId: string;
  rows: BalanceRow[];
  average: number;
  currency?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Fair share is {formatCurrency(average, currency)} each — everyone&apos;s total given, split evenly.
      </p>
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const settled = Math.abs(row.balance) < SETTLED_EPSILON;
          return (
            <div
              key={row.participantId ?? "__me__"}
              className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5"
            >
              <span className={cn("text-sm", settled && "text-muted-foreground")}>{row.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    settled
                      ? "text-muted-foreground"
                      : row.balance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {settled
                    ? "Settled"
                    : row.balance > 0
                      ? `Gets ${formatCurrency(row.balance, currency)}`
                      : `Owes ${formatCurrency(-row.balance, currency)}`}
                </span>
                {!settled && (
                  <SettleTransferDialog
                    eventId={eventId}
                    rows={rows}
                    currency={currency}
                    initiatingParticipantId={row.participantId}
                    trigger={
                      <span className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
