import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { EventChecklist } from "@/components/event-checklist";
import { EventParticipants } from "@/components/event-participants";
import { EventExpenseRow } from "@/components/event-expense-row";
import { EventBalanceTable, type BalanceRow } from "@/components/event-balance-table";
import { AddEventExpenseDialog } from "@/components/add-event-expense-dialog";
import { ScheduledItemsList } from "@/components/scheduled-items-list";
import { ItineraryList } from "@/components/itinerary-list";
import { TripShareButton } from "@/components/trip-share-button";
import { DeleteEventButton } from "@/components/delete-event-button";
import { getEventDetail } from "@/lib/services/events";
import { computeEventBudgetStatus, computeTotalJourneyMoney, computeCountdown, formatCountdown } from "@/lib/domain/event";
import { formatCurrency, formatDate, todayLocalDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteEventAction } from "../actions";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEventDetail(id).catch(() => null);

  if (!result) notFound();

  const {
    event,
    transactions,
    spent,
    checklist,
    participants,
    average,
    balances,
    scheduledItems,
    itinerary,
    categories,
    accounts,
    profile,
  } = result;

  const currency = profile?.currency ?? "BDT";
  const status = computeEventBudgetStatus(
    spent,
    event.budget_amount === null ? null : Number(event.budget_amount),
  );

  const nameForParticipant = (id: string | null) =>
    id === null ? "Myself" : participants.find((p) => p.id === id)?.name ?? "Unknown";

  const balanceRows: BalanceRow[] = balances.map((b) => ({
    participantId: b.participantId,
    name: nameForParticipant(b.participantId),
    balance: b.balance,
  }));

  const totalScheduledRemaining = scheduledItems.reduce((sum, item) => sum + item.remaining, 0);
  const totalJourneyMoney = computeTotalJourneyMoney(
    transactions.map((t) => ({ amount: Number(t.amount) })),
    scheduledItems,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="flex-1 truncate text-lg font-semibold">{event.name}</h1>
        <TripShareButton eventId={id} shareToken={event.share_token} />
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/events/${id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          }
        />
        <DeleteEventButton action={deleteEventAction.bind(null, id)} eventName={event.name} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          {(event.start_date || event.end_date) && (
            <p className="text-sm text-muted-foreground">
              {event.start_date && formatDate(event.start_date)}
              {event.start_date && event.end_date && " – "}
              {event.end_date && formatDate(event.end_date)}
              {(() => {
                const countdown = formatCountdown(
                  computeCountdown(event.start_date, event.end_date, todayLocalDate()),
                );
                return (
                  countdown && (
                    <span
                      className={cn(
                        "ml-1.5 font-medium",
                        countdown === "Happening now" ? "text-emerald-600 dark:text-emerald-400" : "text-primary",
                      )}
                    >
                      · {countdown}
                    </span>
                  )
                );
              })()}
            </p>
          )}

          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              status.isOverBudget && "text-rose-600 dark:text-rose-400",
            )}
          >
            {formatCurrency(spent, currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            Already expended
            {status.budget !== null ? ` · of ${formatCurrency(status.budget, currency)} budget` : ""}
          </p>

          {status.percentUsed !== null && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status.isOverBudget ? "bg-rose-500" : "bg-primary",
                )}
                style={{ width: `${Math.min(100, status.percentUsed)}%` }}
              />
            </div>
          )}

          {totalScheduledRemaining > 0 && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total journey money</span>
              <span className="font-medium tabular-nums">{formatCurrency(totalJourneyMoney, currency)}</span>
            </div>
          )}

          {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <EventChecklist eventId={id} items={checklist} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <EventParticipants eventId={id} participants={participants} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planned</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduledItemsList
            eventId={id}
            items={scheduledItems}
            participants={participants}
            currency={currency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itinerary</CardTitle>
        </CardHeader>
        <CardContent>
          <ItineraryList eventId={id} items={itinerary} />
        </CardContent>
      </Card>

      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <EventBalanceTable eventId={id} rows={balanceRows} average={average} currency={currency} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Money</CardTitle>
          <AddEventExpenseDialog
            eventId={id}
            categories={categories}
            accounts={accounts}
            participants={participants}
            trigger={
              <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" />
                Add
              </span>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-0.5">
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing logged for this trip yet.
            </p>
          ) : (
            transactions.map((tx) => (
              <EventExpenseRow
                key={tx.id}
                eventId={id}
                tx={tx}
                currency={currency}
                participants={participants}
                categories={categories}
                accounts={accounts}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
