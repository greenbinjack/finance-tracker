import Link from "next/link";
import { ChevronRight, TrendingUp, HandCoins, CalendarRange, Settings, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  { icon: PiggyBank, title: "Budgets", desc: "Set monthly caps per category", href: "/budgets" },
  { icon: TrendingUp, title: "Investments", desc: "Track stocks, funds, FDs & crypto", href: "/investments" },
  { icon: HandCoins, title: "Loans", desc: "Money you've given or borrowed", href: "/loans" },
  { icon: CalendarRange, title: "Events & trips", desc: "Budget a gathering or a trip", href: "/events" },
  { icon: Settings, title: "Settings", desc: "Categories, accounts, currency, theme", href: "/settings" },
];

export default function MorePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">More</h1>
      <div className="flex flex-col gap-2">
        {sections.map(({ icon: Icon, title, desc, href }) => (
          <Link key={title} href={href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
