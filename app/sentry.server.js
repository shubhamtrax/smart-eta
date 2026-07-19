import * as Sentry from "@sentry/node";

// Only initializes if SENTRY_DSN is set — locally (no env var) this is a
// harmless no-op, so nothing breaks in dev, and Sentry only activates in
// production once you've added the DSN as an env var on Render.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Keep this low — SmartETA doesn't need full request tracing, just
    // error capture. Raise it later if you want performance monitoring too.
    tracesSampleRate: 0.1,
  });
}

/**
 * Reports an exception to Sentry with the shop attached as a tag, so you
 * can filter/search issues by which merchant hit them. Safe to call even
 * if Sentry isn't configured (SENTRY_DSN unset) — it just does nothing.
 */
export function reportError(err, { shop } = {}) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (shop) scope.setTag("shop", shop);
    Sentry.captureException(err);
  });
}

export { Sentry };