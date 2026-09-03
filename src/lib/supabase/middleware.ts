import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ensureDefaultsSeeded } from "@/lib/services/onboarding";
import type { Database } from "@/lib/supabase/database.types";

const SEEDED_COOKIE = "fp_seeded";

// Gates access on every request. Uses getSession() (reads/validates the JWT
// locally, no network call) rather than getUser() (which round-trips to
// Supabase's Auth API every time) — safe here because this check only
// decides whether to redirect to /login; actual data access is still
// enforced server-side by Postgres RLS regardless of what this returns, so
// a stale local session can't leak data, only misroute a redirect.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isForgotPasswordRoute = request.nextUrl.pathname.startsWith("/forgot-password");
  // Clicking the password-reset email link lands here already "logged in"
  // via a temporary Supabase recovery session — it must NOT be redirected
  // away like a normal authenticated visit to /login would be.
  const isResetPasswordRoute = request.nextUrl.pathname.startsWith("/reset-password");
  const isPublicAsset = request.nextUrl.pathname.startsWith("/manifest") ||
    request.nextUrl.pathname.startsWith("/icons") ||
    request.nextUrl.pathname.startsWith("/sw.js");
  // The password-reset email link lands here first to exchange its code for
  // a session, before ever reaching /reset-password — no user yet either.
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isMfaChallengeRoute = request.nextUrl.pathname.startsWith("/mfa-challenge");
  // A trip's public share link — meant for anyone with the URL, signed in or
  // not, so it's exempt from every auth check below, same as a static asset.
  const isSharedTripRoute = request.nextUrl.pathname.startsWith("/trips/");

  if (
    !user &&
    !isAuthRoute &&
    !isForgotPasswordRoute &&
    !isResetPasswordRoute &&
    !isAuthCallback &&
    !isPublicAsset &&
    !isSharedTripRoute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // A password sign-in alone only reaches aal1 for a user enrolled in 2FA —
  // getAuthenticatorAssuranceLevel() says aal2 is required but not yet met,
  // meaning they still owe a TOTP code before they're really "signed in".
  let needsMfaChallenge = false;
  if (user && !isPublicAsset && !isForgotPasswordRoute && !isResetPasswordRoute && !isAuthCallback && !isSharedTripRoute) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfaChallenge = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
  }

  if (user && needsMfaChallenge && !isMfaChallengeRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/mfa-challenge";
    return NextResponse.redirect(url);
  }

  if (user && !needsMfaChallenge && (isAuthRoute || isForgotPasswordRoute || isMfaChallengeRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Runs the "does this user have default categories/an account yet" check
  // at most once per browser (cookie-gated) instead of on every single page
  // load forever — was previously re-querying the database twice per
  // navigation for a check that's only ever meaningful right after signup.
  if (user && !request.cookies.get(SEEDED_COOKIE)) {
    try {
      await ensureDefaultsSeeded(supabase, user.id);
      supabaseResponse.cookies.set(SEEDED_COOKIE, "1", { maxAge: 60 * 60 * 24 * 365 });
    } catch {
      // Leave the cookie unset so this retries on the next request — seeding
      // failures should be self-healing, not fatal to navigation.
    }
  }

  return supabaseResponse;
}
