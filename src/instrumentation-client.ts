/**
 * No-op unless NEXT_PUBLIC_SENTRY_DSN is set — safe to ship even without a
 * Sentry account, and avoids shipping the Sentry client bundle to every
 * visitor until it's actually configured. Set it (and SENTRY_DSN for the
 * server, see instrumentation.ts) to start reporting.
 *
 * The dynamic import here is fire-and-forget per Next's execution-timing
 * rules (only sync top-level code is guaranteed before hydration), so once a
 * DSN is added, very early pre-hydration errors could be missed. Acceptable
 * for this app; switch to a static `import * as Sentry` if that ever matters.
 */
export let onRouterTransitionStart: (url: string, navigationType: string) => void = () => {};

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
    onRouterTransitionStart = Sentry.captureRouterTransitionStart;
  });
}
