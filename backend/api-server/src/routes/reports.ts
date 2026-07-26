import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as reports from "../services/reports";
import { ok, resolveLang } from "../lib/http";

const parseIds = (q: any): string[] | undefined =>
  q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;
const phoneProp = { phone_number_ids: { type: "string" } };

async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/reports/daily", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { date: { type: "string" }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await reports.getReport(request.user.sub, resolveLang(request), "daily", { date: q.date }, parseIds(q)));
  });

  app.get("/api/v1/reports/weekly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { start: { type: "string" }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await reports.getReport(request.user.sub, resolveLang(request), "weekly", { start: q.start }, parseIds(q)));
  });

  app.get("/api/v1/reports/monthly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: {
      year: { type: "integer", minimum: 2026 }, month: { type: "integer", minimum: 1, maximum: 12 }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await reports.getReport(request.user.sub, resolveLang(request), "monthly", { year: q.year, month: q.month }, parseIds(q)));
  });
}

export default fp(reportRoutes);


