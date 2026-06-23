import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as reports from "../services/reports";
import { ok, resolveLang } from "../lib/http";

const TX_TYPES = ["send", "receive", "payment", "withdrawal", "deposit", "airtime", "fee"];

function buildScope(q: any) {
  return {
    phoneNumberIds: q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
    provider: q.provider || undefined,
    type: q.type || undefined,
    categoryId: q.category_id || undefined,
  };
}

const scopeProps = {
  phone_number_ids: { type: "string" },
  provider:         { type: "string" },
  type:             { type: "string", enum: TX_TYPES },
  category_id:      { type: "string" },
};

async function reportRoutes(app: FastifyInstance): Promise<void> {

  // Daily — ?date=YYYY-MM-DD (default today, EAT)
  app.get("/api/v1/reports/daily", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { date: { type: "string" }, ...scopeProps } } },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await reports.getReport(request.user.sub, resolveLang(request), "daily", { date: q.date }, buildScope(q));
    return ok(reply, data);
  });

  // Weekly — ?start=YYYY-MM-DD (7-day window; default last 7 days)
  app.get("/api/v1/reports/weekly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { start: { type: "string" }, ...scopeProps } } },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await reports.getReport(request.user.sub, resolveLang(request), "weekly", { start: q.start }, buildScope(q));
    return ok(reply, data);
  });

  // Monthly — ?year=&month= (default current, EAT)
  app.get("/api/v1/reports/monthly", {
    preHandler: app.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: { year: { type: "integer", minimum: 2026 }, month: { type: "integer", minimum: 1, maximum: 12 }, ...scopeProps },
      },
    },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await reports.getReport(request.user.sub, resolveLang(request), "monthly", { year: q.year, month: q.month }, buildScope(q));
    return ok(reply, data);
  });
}

export default fp(reportRoutes);


// -----------------------------------

// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as reports from "../services/reports";
// import { ok, resolveLang } from "../lib/http";

// const TX_TYPES = ["send", "receive", "payment", "withdrawal", "deposit", "airtime", "fee"];

// function buildScope(q: any) {
//   return {
//     phoneNumberIds: q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
//     provider: q.provider || undefined,
//     type: q.type || undefined,
//     categoryId: q.category_id || undefined,
//   };
// }

// async function reportRoutes(app: FastifyInstance): Promise<void> {
//   app.get("/api/v1/reports/monthly", {
//     preHandler: app.authenticate,
//     schema: {
//       querystring: {
//         type: "object",
//         properties: {
//           year:             { type: "integer", minimum: 2026 },
//           month:            { type: "integer", minimum: 1, maximum: 12 },
//           phone_number_ids: { type: "string" },
//           provider:         { type: "string" },
//           type:             { type: "string", enum: TX_TYPES },
//           category_id:      { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await reports.getMonthlyReport(request.user.sub, resolveLang(request), q.year, q.month, buildScope(q));
//     return ok(reply, data);
//   });
// }

// export default fp(reportRoutes);