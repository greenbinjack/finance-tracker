"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, List, PlusCircle, PieChart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  primary?: boolean;
}

const items: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "History", icon: List },
  { href: "/transactions/new", label: "Add", icon: PlusCircle, primary: true },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/more", label: "More", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-center justify-between px-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                  primary ? "text-primary" : active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active && !primary && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute -top-[1px] h-0.5 w-8 rounded-full bg-foreground"
                  />
                )}
                <Icon className={cn(primary ? "h-8 w-8" : "h-5 w-5")} strokeWidth={primary ? 1.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
