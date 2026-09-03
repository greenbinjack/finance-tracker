import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { signIn, signUp } from "./actions";
import { AuthCard } from "@/components/auth-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance Tracker</h1>
        <p className="text-sm text-muted-foreground">Your money, day to day.</p>
      </div>

      <AuthCard>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Sign up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form action={signIn} className="flex flex-col gap-4 pt-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign in
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    <Link href="/forgot-password" className="underline hover:text-foreground">
                      Forgot password?
                    </Link>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form action={signUp} className="flex flex-col gap-4 pt-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <p className="mt-4 text-center text-sm text-destructive">{error}</p>
            )}
            {message && (
              <p className="mt-4 text-center text-sm text-muted-foreground">{message}</p>
            )}
          </CardContent>
        </Card>
      </AuthCard>
    </div>
  );
}
