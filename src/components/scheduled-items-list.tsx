import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScheduledItemDialog } from "@/components/scheduled-item-dialog";
import { FulfillScheduledItemDialog } from "@/components/fulfill-scheduled-item-dialog";
import { deleteScheduledItemAction } from "@/app/(app)/events/actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ScheduledItemData {
  id: string;
  type: "expense" | "income";
  amount: number;
  note: string | null;
  fulfilled: number;
  remaining: number;
}

export function ScheduledItemsList({
  eventId,
  items,
  participants,
  currency,
}: {
  eventId: string;
  items: ScheduledItemData[];
  participants: { id: string; name: string }[];
  currency?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing planned yet — add what you expect to spend or receive.
        </p>
      ) : (
        items.map((item) => {
          const isIncome = item.type === "income";
          const percent = item.amount > 0 ? Math.min(100, (item.fulfilled / item.amount) * 100) : 0;
          const label = item.note || (isIncome ? "Income" : "Expense");

          return (
            <div key={item.id} className="flex flex-col gap-1.5 rounded-lg px-2 py-2.5 hover:bg-muted/60">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                    isIncome
                      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-400",
                  )}
                >
                  {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatCurrency(item.fulfilled, currency)} of {formatCurrency(item.amount, currency)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {item.remaining > 0 && (
                    <FulfillScheduledItemDialog
                      eventId={eventId}
                      scheduledItemId={item.id}
                      type={item.type}
                      remaining={item.remaining}
                      label={label}
                      participants={participants}
                      currency={currency}
                      trigger={
                        <span className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <CircleDollarSign className="h-3.5 w-3.5" />
                        </span>
                      }
                    />
                  )}
                  <ScheduledItemDialog
                    eventId={eventId}
                    existing={item}
                    currency={currency}
                    trigger={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        nativeButton={false}
                        render={
                          <span>
                            <Pencil className="h-3.5 w-3.5" />
                          </span>
                        }
                      />
                    }
                  />
                  <ConfirmDialog
                    title="Delete this planned item?"
                    description="Any money already logged against it stays in your trip's Money list — this only removes the plan."
                    onConfirm={deleteScheduledItemAction.bind(null, eventId, item.id)}
                    errorMessage="Couldn't delete this. Please try again."
                    trigger={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        nativeButton={false}
                        render={
                          <span>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </span>
                        }
                      />
                    }
                  />
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", isIncome ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })
      )}

      <ScheduledItemDialog
        eventId={eventId}
        trigger={
          <span className="mt-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" />
            Add plan
          </span>
        }
      />
    </div>
  );
}
