import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Not the Supabase auth callback / shared trip pages, which are
        // meant to be reached via an external link — everything else in
        // the app is same-origin only.
        source: "/:path*",
        headers: [
          // No other site may frame this app — blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Stop the browser from guessing a response's MIME type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full URL (which can carry a share token) to a
          // third-party site's server logs when a link is clicked from here.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No use for camera/mic/geolocation/etc. anywhere in this app.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // HTTPS-only going forward, including subdomains.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// Wrapping is safe even without a Sentry account: without SENTRY_AUTH_TOKEN
// set, this just skips source map upload at build time — no DSN required.
export default withSentryConfig(nextConfig, {
  silent: true,
});
