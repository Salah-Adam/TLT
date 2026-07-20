import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,                 // unset in dev → Sentry quietly no-ops
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0,                          // errors only, no performance tracing (stays in free quota)
  sendDefaultPii: false,
  beforeSend(event) {
    // Finance app: never ship request bodies or auth headers to a third party.
    if (event.request) {
      delete event.request.data;
      delete (event.request as any).cookies;
      const h = event.request.headers as Record<string, string> | undefined;
      if (h) { delete h["authorization"]; delete h["cookie"]; }
    }
    return event;
  },
});