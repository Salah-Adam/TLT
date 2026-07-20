import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0,
  sendDefaultPii: false,
  initialScope: { tags: { service: "workers" } },  // so you can tell worker errors from api errors
});