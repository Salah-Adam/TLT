import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as txService from "../services/transactions";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

async function transactionRoutes(app: FastifyInstance): Promise<void> {

  // ── List ───────────────────────────────────────────────────────
  app.get("/api/v1/transactions", {
    preHandler: app.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: {
          phone_number_ids: { type: "string" },
          direction:        { type: "string", enum: ["in", "out"] },
          type:             { type: "string" },
          category_id:      { type: "string" },
          date_from:        { type: "string" },
          date_to:          { type: "string" },
          cursor:           { type: "string" },
          limit:            { type: "integer", minimum: 10, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const q = request.query as any;
    const r = await txService.listTransactions({
      userId: request.user.sub,
      lang: resolveLang(request),
      phoneNumberIds: q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
      direction: q.direction,
      type: q.type,
      categoryId: q.category_id,
      dateFrom: q.date_from,
      dateTo: q.date_to,
      cursor: q.cursor,
      limit: q.limit,
    });
    return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more });
  });

  // ── Search ─────────────────────────────────────────────────────
  app.get("/api/v1/transactions/search", {
    preHandler: app.authenticate,
    schema: {
      querystring: {
        type: "object",
        required: ["q"],
        properties: {
          q:                { type: "string", minLength: 1 },
          phone_number_ids: { type: "string" },
          direction:        { type: "string", enum: ["in", "out"] },
          date_from:        { type: "string" },
          date_to:          { type: "string" },
          cursor:           { type: "string" },
          limit:            { type: "integer", minimum: 10, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const q = request.query as any;
    const r = await txService.searchTransactions({
      userId: request.user.sub,
      lang: resolveLang(request),
      q: q.q,
      phoneNumberIds: q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
      direction: q.direction,
      dateFrom: q.date_from,
      dateTo: q.date_to,
      cursor: q.cursor,
      limit: q.limit,
    });
    return ok(reply, r.transactions, 200, { cursor: r.cursor, has_more: r.has_more });
  });

  // ── List deleted (recoverable) ─────────────────────────────────
  app.get("/api/v1/transactions/deleted", {
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const rows = await txService.listDeletedTransactions(request.user.sub, resolveLang(request));
    return ok(reply, rows);
  });


  // newly added one --------------------
  app.get("/api/v1/transactions/unread-count", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, { count: await txService.countUnseen(request.user.sub) });
  });
  app.post("/api/v1/transactions/mark-seen", { preHandler: app.authenticate }, async (request, reply) => {
    await txService.markAllSeen(request.user.sub);
    return ok(reply, { message: "ok" });
  });

  // ── Get one ────────────────────────────────────────────────────
  app.get("/api/v1/transactions/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tx = await txService.getTransaction(request.user.sub, id, resolveLang(request));
    return ok(reply, tx);
  });

  // ── Update (category / note) ───────────────────────────────────
  app.patch("/api/v1/transactions/:id", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: {
        type: "object",
        properties: {
          category_id: { type: ["string", "null"] },
          note:        { type: ["string", "null"] },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { category_id?: string | null; note?: string | null };
    const tx = await txService.updateTransaction({
      userId: request.user.sub,
      id,
      lang: resolveLang(request),
      categoryId: b.category_id,
      note: b.note,
    });
    return ok(reply, tx);
  });

  // ── Delete (soft) ──────────────────────────────────────────────
  app.delete("/api/v1/transactions/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await txService.deleteTransaction(request.user.sub, id);
    return ok(reply, { message: t("TRANSACTION_DELETED", resolveLang(request)), recoverable_until: r.recoverableUntil });
  });

  // ── Recover ────────────────────────────────────────────────────
  app.post("/api/v1/transactions/:id/recover", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tx = await txService.recoverTransaction(request.user.sub, id, resolveLang(request));
    return ok(reply, tx);
  });

  app.post("/api/v1/transactions/:id/seen", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await txService.markSeen(request.user.sub, id);
    return ok(reply, { message: "ok" });
  });

}

export default fp(transactionRoutes);