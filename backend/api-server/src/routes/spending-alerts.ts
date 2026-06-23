import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as alerts from "../services/spending-alerts";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

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
}

export default fp(spendingAlertRoutes);