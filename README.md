# Finance Tracker

A personal finance PWA for daily expense/income tracking, investments, loans,
and event/trip budget planning with group expense splitting.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack)
- [Supabase](https://supabase.com) (Postgres, Auth, Storage)
- TypeScript, Tailwind CSS, [Base UI](https://base-ui.com)
- [Vitest](https://vitest.dev) for unit tests, [Playwright](https://playwright.dev) for end-to-end tests

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com), then open the
SQL Editor and run the full contents of `supabase/schema.sql`. This sets up
every table, Row Level Security policy, and database function the app needs.
The file is idempotent — safe to re-run any time, including after pulling
schema changes.

In your Supabase project, also:

- Create a **Storage bucket** named `receipts` if it wasn't created by the
  SQL script (it is, via `insert into storage.buckets`) — used for expense
  receipt photo uploads.
- Under **Authentication → Providers → Email**, decide whether you want
  "Confirm email" enabled (recommended for a real deployment; you may want
  it off for quick local testing).

### 3. Environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Both values are on your Supabase project's **Settings → API** page.

Optionally, for production error monitoring, add a [Sentry](https://sentry.io) project's DSN:

```bash
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

Error monitoring is fully wired but inert without these — nothing is sent anywhere until they're set.

Optionally, for field-level encryption of stored account/card numbers, add a 32-byte base64 key:

```bash
ACCOUNT_ENCRYPTION_KEY=your-generated-key
```

Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Without this set, account/card numbers are stored as plain text (still scoped to you alone via
Row Level Security, just not encrypted at the field level). Once set, new/edited accounts are
encrypted automatically; existing plaintext accounts are encrypted the next time they're saved. If
you set this in production, use the **same key** everywhere your app runs against the same
database — a different key per environment means each one can't decrypt the other's data.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up for an
account — default categories and a starter account are seeded automatically
on first login.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright) — needs E2E_EMAIL / E2E_PASSWORD
                   # env vars for a real test account; skips automatically if unset
```

## Deployment

Deploys cleanly to [Vercel](https://vercel.com) — set the same two
environment variables from step 3 in your Vercel project settings.
