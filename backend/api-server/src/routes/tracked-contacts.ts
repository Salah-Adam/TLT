import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as tc from "../services/tracked-contacts";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

const DIRECTIONS = ["sent", "received", "both"];

async function trackedContactRoutes(app: FastifyInstance): Promise<void> {

  app.post("/api/v1/tracked-contacts", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["label", "phoneNumbers"],
        properties: {
          label:             { type: "string", minLength: 1, maxLength: 100 },
          trackingDirection: { type: "string", enum: DIRECTIONS },
          phoneNumbers:      { type: "array", items: { type: "string" }, minItems: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const contact = await tc.createContact({ userId: request.user.sub, ...(request.body as any) });
    return ok(reply, contact, 201);
  });

  app.get("/api/v1/tracked-contacts", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, await tc.listContacts(request.user.sub));
  });

  app.get("/api/v1/tracked-contacts/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return ok(reply, await tc.getContact(request.user.sub, id));
  });

  app.patch("/api/v1/tracked-contacts/:id", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: {
        type: "object",
        properties: {
          label:             { type: "string", minLength: 1, maxLength: 100 },
          trackingDirection: { type: "string", enum: DIRECTIONS },
          isActive:          { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contact = await tc.updateContact({ userId: request.user.sub, id, ...(request.body as any) });
    return ok(reply, contact);
  });

  app.delete("/api/v1/tracked-contacts/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await tc.deleteContact(request.user.sub, id);
    return ok(reply, { message: t("CONTACT_DELETED", resolveLang(request)) });
  });

  app.post("/api/v1/tracked-contacts/:id/numbers", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: { type: "object", required: ["number"], properties: { number: { type: "string" } } },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { number } = request.body as { number: string };
    const contact = await tc.addNumber(request.user.sub, id, number);
    return ok(reply, contact, 201);
  });

  app.delete("/api/v1/tracked-contacts/:id/numbers/:numberId", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id", "numberId"], properties: { id: { type: "string" }, numberId: { type: "string" } } } },
  }, async (request, reply) => {
    const { id, numberId } = request.params as { id: string; numberId: string };
    await tc.removeNumber(request.user.sub, id, numberId);
    return ok(reply, { message: t("NUMBER_REMOVED", resolveLang(request)) });
  });

  app.get("/api/v1/tracked-contacts/:id/transactions", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      querystring: {
        type: "object",
        properties: {
          cursor:    { type: "string" },
          limit:     { type: "integer", minimum: 10, maximum: 100 },
          number_id: { type: "string" },
          date_from: { type: "string" },
          date_to:   { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as any;
    const numberIds = q.number_ids ? String(q.number_ids).split(",").filter(Boolean) : undefined;
    const r = await tc.getContactTransactions(request.user.sub, resolveLang(request), id, q.cursor, q.limit, {
      numberIds, dateFrom: q.date_from, dateTo: q.date_to,
    });
    // return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more });
    return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more, summary: r.summary });
  });
  // async (request, reply) => {
  //   const { id } = request.params as { id: string };
  //   const q = request.query as any;
  //   const r = await tc.getContactTransactions(request.user.sub, resolveLang(request), id, q.cursor, q.limit, {
  //     numberId: q.number_id, dateFrom: q.date_from, dateTo: q.date_to,
  //   });
  //   return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more });
  // });

  // app.get("/api/v1/tracked-contacts/:id/transactions", {
  //   preHandler: app.authenticate,
  //   schema: {
  //     params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  //     querystring: { type: "object", properties: { cursor: { type: "string" }, limit: { type: "integer", minimum: 10, maximum: 100 } } },
  //   },
  // }, async (request, reply) => {
  //   const { id } = request.params as { id: string };
  //   const q = request.query as any;
  //   const r = await tc.getContactTransactions(request.user.sub, resolveLang(request), id, q.cursor, q.limit);
  //   return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more });
  // });

}

export default fp(trackedContactRoutes);