"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Always goes to wherever the user actually came from (browser history),
 * not a hardcoded parent route — a loan reminder tapped from the dashboard
 * returns to the dashboard, not to /loans. */
export function BackButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.back()}>
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}
