import Fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { config } from "./config";
import jwtPlugin from "./jwt";
import authRoutes from "./routes/auth";
import phoneNumberRoutes from "./routes/phone-numbers";
import transactionRoutes from "./routes/transactions";
import { AppError } from "./lib/errors";
import { resolveLang } from "./lib/http";
import { t } from "./lib/messages";
import analyticsRoutes from "./routes/analytics";
import reportRoutes from "./routes/reports";
import trackedContactRoutes from "./routes/tracked-contacts";
import spendingAlertRoutes from "./routes/spending-alerts";
import notificationRoutes from "./routes/notifications";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import rateLimit from "@fastify/rate-limit";
import Redis from "ioredis";
import "./instrument";
import * as Sentry from "@sentry/node";

export function buildApp() {
  const app = Fastify({
    logger: { level: "debug", transport: { target: "pino-pretty" } },
  });

  app.register(helmet);
  app.register(cors, { origin: true });
  app.register(jwtPlugin);

  const rateLimitRedis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // if Redis is down, fail fast — the plugin then fails open
  });

  app.register(rateLimit, {
    global: false, // opt-in per route
    redis: rateLimitRedis,
    errorResponseBuilder: (request, _context) => ({
      success: false,
      error: { code: "RATE_LIMITED", message: t("RATE_LIMITED", resolveLang(request)) },
    }),
  });

  app.addHook("onClose", () => {
    rateLimitRedis.disconnect();
  });

  // ── Global error handler — single-language envelope ─────────────────────────
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const lang = resolveLang(request);

    if ((error as any).validation) {
      const path = (error as any).validation?.[0]?.instancePath ?? "";
      const field = path ? path.replace(/^\//, "") : undefined;
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: t("VALIDATION_ERROR", lang), ...(field ? { field } : {}) },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: t(error.code, lang, error.params),
          ...(error.field ? { field: error.field } : {}),
        },
      });
    }

    const rl = error as any;
    if (reply.statusCode === 429 || rl?.statusCode === 429 || rl?.error?.code === "RATE_LIMITED" || rl?.code === "RATE_LIMITED") {
      return reply.status(429).send({ success: false, error: { code: "RATE_LIMITED", message: t("RATE_LIMITED", lang) } });
    }

    const statusCode = (error as any).statusCode ?? 500;
    if (statusCode >= 500) { app.log.error(error); Sentry.captureException(error); }
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode >= 500 ? "INTERNAL_ERROR" : "ERROR",
        message: statusCode >= 500 ? t("INTERNAL_ERROR", lang) : (error.message || t("ERROR", lang)),
      },
    });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    service: "api-server",
    timestamp: new Date().toISOString(),
  }));

  app.register(authRoutes);
  app.register(phoneNumberRoutes);
  app.register(transactionRoutes);
  app.register(analyticsRoutes);
  app.register(reportRoutes);
  app.register(trackedContactRoutes);
  app.register(spendingAlertRoutes);
  app.register(notificationRoutes);
  app.register(userRoutes);
  app.register(categoryRoutes);

  return app;
}