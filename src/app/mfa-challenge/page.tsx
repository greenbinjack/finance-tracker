import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth-card";
import { signOut } from "@/app/(app)/actions";
import { verifyMfaChallenge } from "./actions";

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance Tracker</h1>
      </div>

      <AuthCard>
        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={verifyMfaChallenge} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mfa-code">Code</Label>
                <Input
                  id="mfa-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Verify
              </Button>
            </form>
            {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
            <form action={signOut} className="mt-4 text-center">
              <button type="submit" className="text-sm text-muted-foreground underline hover:text-foreground">
                Sign out instead
              </button>
            </form>
          </CardContent>
        </Card>
      </AuthCard>
    </div>
  );
}
