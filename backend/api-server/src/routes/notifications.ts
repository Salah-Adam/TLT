import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as notifications from "../services/notifications";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

const TYPES = [
  "transaction_received", "transaction_sent", "spending_alert",
  "daily_summary", "weekly_summary", "monthly_summary",
  "report_ready", "trial_ending", "account",
];

async function notificationRoutes(app: FastifyInstance): Promise<void> {

  // ── List ───────────────────────────────────────────────────────
  app.get("/api/v1/notifications", {
    preHandler: app.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: {
          unread_only: { type: "boolean" },
          type:        { type: "string", enum: TYPES },
          cursor:      { type: "string" },
          limit:       { type: "integer", minimum: 10, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const q = request.query as any;
    const r = await notifications.listNotifications({
      userId: request.user.sub,
      lang: resolveLang(request),
      unreadOnly: q.unread_only,
      type: q.type,
      cursor: q.cursor,
      limit: q.limit,
    });
    return ok(reply, r.notifications, 200, { cursor: r.cursor, has_more: r.has_more, unread_count: r.unread_count });
  });

  // ── Unread badge count ─────────────────────────────────────────
  app.get("/api/v1/notifications/unread-count", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, { unread_count: await notifications.unreadCount(request.user.sub) });
  });

  // ── Mark one read ──────────────────────────────────────────────
  app.patch("/api/v1/notifications/:id/read", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return ok(reply, await notifications.markRead(request.user.sub, id, resolveLang(request)));
  });

  // ── Mark all read ──────────────────────────────────────────────
  app.post("/api/v1/notifications/read-all", { preHandler: app.authenticate }, async (request, reply) => {
    const n = await notifications.markAllRead(request.user.sub);
    return ok(reply, { message: t("NOTIFICATIONS_MARKED_READ", resolveLang(request)), updated: n });
  });

  // ── Delete one ─────────────────────────────────────────────────
  app.delete("/api/v1/notifications/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await notifications.deleteNotification(request.user.sub, id);
    return ok(reply, { message: t("NOTIFICATION_DELETED", resolveLang(request)) });
  });
}

export default fp(notificationRoutes);