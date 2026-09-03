import type { Instrumentation } from "next";

/**
 * No-op unless SENTRY_DSN is set — safe to ship even without a Sentry
 * account. Set SENTRY_DSN (and NEXT_PUBLIC_SENTRY_DSN for the client, see
 * instrumentation-client.ts) to start reporting.
 */
export async function register() {
  // Node's default fetch (undici) opens a fresh connection per host with a
  // fairly small pool; a page that fires several Supabase queries at once
  // (Reports does ~8) was found to occasionally stall for 10+ seconds
  // waiting on a connection slot under real-world network conditions — see
  // get_dashboard_data in schema.sql for the same issue's root cause. A
  // larger, connection-reusing pool for this one process fixes it without
  // touching every page that fans out multiple queries.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { Agent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new Agent({ connections: 32, keepAliveTimeout: 30_000 }));
  }

  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
