import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as alerts from "../services/spending-alerts";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";
import * as txService from "../services/transactions";

async function spendingAlertRoutes(app: FastifyInstance): Promise<void> {

  app.get("/api/v1/spending-alerts", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, await alerts.listAlerts(request.user.sub, resolveLang(request)));
  });

  app.post("/api/v1/spending-alerts", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["categoryId", "limitAmount"],
        properties: {
          categoryId:     { type: "string" },
          limitAmount:    { type: "number", exclusiveMinimum: 0 },
          period:         { type: "string", enum: ["weekly", "monthly"] },
          alertThreshold: { type: "number", minimum: 1, maximum: 100 },
          phoneNumberId:  { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const a = await alerts.createAlert({ userId: request.user.sub, lang: resolveLang(request), ...(request.body as any) });
    return ok(reply, a, 201);
  });

  app.patch("/api/v1/spending-alerts/:id", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: {
        type: "object",
        properties: {
          limitAmount:    { type: "number", exclusiveMinimum: 0 },
          alertThreshold: { type: "number", minimum: 1, maximum: 100 },
          isActive:       { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = await alerts.updateAlert({ userId: request.user.sub, lang: resolveLang(request), id, ...(request.body as any) });
    return ok(reply, a);
  });

  app.delete("/api/v1/spending-alerts/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await alerts.deleteAlert(request.user.sub, id);
    return ok(reply, { message: t("ALERT_DELETED", resolveLang(request)) });
  });

  app.get("/api/v1/spending-alerts/:id/transactions", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      querystring: {
        type: "object",
        properties: {
          date_from: { type: "string" },
          date_to:   { type: "string" },
          cursor:    { type: "string" },
          limit:     { type: "integer", minimum: 10, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as any;
    const userId = request.user.sub;
    const lang = resolveLang(request);

    const scope = await alerts.getAlertScope(userId, id);
    const dateFrom = q.date_from || scope.periodStart;
    const dateTo   = q.date_to   || scope.periodEnd;

    const list = await txService.listTransactions({
      userId, lang,
      categoryId: scope.categoryId,
      phoneNumberIds: scope.phoneNumberId ? [scope.phoneNumberId] : undefined,
      dateFrom, dateTo, cursor: q.cursor, limit: q.limit,
    });

    // Accurate spent for the same range, via the alert's own definition (includes deleted).
    const summary = q.cursor ? undefined : await alerts.spendInRange(userId, scope.categoryId, dateFrom, dateTo, scope.phoneNumberId);

    return ok(reply, list.transactions, 200, { cursor: list.cursor, has_more: list.has_more, ...(summary ? { summary } : {}) });
  });
}

export default fp(spendingAlertRoutes);