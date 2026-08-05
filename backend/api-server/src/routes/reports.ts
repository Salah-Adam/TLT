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

  const anchorFrom = (q: any) => ({ date: q.date, start: q.start, year: q.year ? Number(q.year) : undefined, month: q.month ? Number(q.month) : undefined });
  const periodParam = { type: "object", required: ["period"], properties: { period: { type: "string", enum: ["daily", "weekly", "monthly"] } } };
  const anchorQuery = { type: "object", properties: { date: { type: "string" }, start: { type: "string" }, year: { type: "integer" }, month: { type: "integer" } } };

  app.get("/api/v1/reports/:period/budgets", { preHandler: app.authenticate, schema: { params: periodParam, querystring: anchorQuery } },
    async (request, reply) => {
      const { period } = request.params as any;
      return ok(reply, await reports.getReportBudgets(request.user.sub, resolveLang(request), period, anchorFrom(request.query)));
    });

  app.get("/api/v1/reports/:period/tracked", { preHandler: app.authenticate, schema: { params: periodParam, querystring: anchorQuery } },
    async (request, reply) => {
      const { period } = request.params as any;
      return ok(reply, await reports.getReportTracked(request.user.sub, resolveLang(request), period, anchorFrom(request.query)));
    });

}

export default fp(reportRoutes);


