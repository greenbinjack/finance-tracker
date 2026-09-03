import type { Instrumentation } from "next";

/**
 * No-op unless SENTRY_DSN is set — safe to ship even without a Sentry
 * account. Set SENTRY_DSN (and NEXT_PUBLIC_SENTRY_DSN for the client, see
 * instrumentation-client.ts) to start reporting.
 */
export async function register() {
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
