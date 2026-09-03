import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrapping is safe even without a Sentry account: without SENTRY_AUTH_TOKEN
// set, this just skips source map upload at build time — no DSN required.
export default withSentryConfig(nextConfig, {
  silent: true,
});
