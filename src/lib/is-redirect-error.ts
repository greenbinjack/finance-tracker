/**
 * Server Actions that call redirect() signal it by throwing an error with a
 * `NEXT_REDIRECT` digest, which Next.js's own machinery intercepts to perform
 * the navigation. When a Server Action is invoked directly from a Client
 * Component (rather than via a <form action>) and wrapped in try/catch, that
 * thrown redirect gets caught too — this lets callers tell the difference
 * from a genuine error and re-throw so Next can still handle it.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
