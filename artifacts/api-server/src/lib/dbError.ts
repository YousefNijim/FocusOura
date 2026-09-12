/**
 * Drizzle reports only `Failed query: <sql>` and keeps the driver's own message
 * on `cause`. That has now hidden three separate production faults — a missing
 * `withered_at` column, a referrer-blocked API key, and whatever is currently
 * breaking the challenges listing — each of which cost a debugging round trip
 * because the log said a query failed without saying why.
 *
 * Log through this instead of `err.message` and the reason travels with it.
 */
export function describeDbError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message && cause.message !== err.message) {
    return `${err.message} — cause: ${cause.message}`;
  }
  return err.message;
}
