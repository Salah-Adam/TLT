import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as analytics from "../services/analytics";
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

async function analyticsRoutes(app: FastifyInstance): Promise<void> {

  app.get("/api/v1/analytics/dashboard", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { ...scopeProps } } },
  }, async (request, reply) => {
    const data = await analytics.getDashboard(request.user.sub, buildScope(request.query as any));
    return ok(reply, data);
  });

  app.get("/api/v1/analytics/daily", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { date: { type: "string" }, ...scopeProps } } },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await analytics.getDaily(request.user.sub, resolveLang(request), q.date, buildScope(q));
    return ok(reply, data);
  });

  app.get("/api/v1/analytics/weekly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { start: { type: "string" }, ...scopeProps } } },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await analytics.getWeekly(request.user.sub, resolveLang(request), q.start, buildScope(q));
    return ok(reply, data);
  });

  app.get("/api/v1/analytics/monthly", {
    preHandler: app.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: {
          year:  { type: "integer", minimum: 2026 },
          month: { type: "integer", minimum: 1, maximum: 12 },
          ...scopeProps,
        },
      },
    },
  }, async (request, reply) => {
    const q = request.query as any;
    const data = await analytics.getMonthly(request.user.sub, resolveLang(request), q.year, q.month, buildScope(q));
    return ok(reply, data);
  });
}

export default fp(analyticsRoutes);

// -------------------------------


// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as analytics from "../services/analytics";
// import { ok, resolveLang } from "../lib/http";

// function parsePhoneIds(v: unknown): string[] | undefined {
//   if (!v) return undefined;
//   return String(v).split(",").map((s) => s.trim()).filter(Boolean);
// }

// async function analyticsRoutes(app: FastifyInstance): Promise<void> {

//   app.get("/api/v1/analytics/dashboard", {
//     preHandler: app.authenticate,
//     schema: { querystring: { type: "object", properties: { phone_number_ids: { type: "string" } } } },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getDashboard(request.user.sub, parsePhoneIds(q.phone_number_ids));
//     return ok(reply, data);
//   });

//   app.get("/api/v1/analytics/daily", {
//     preHandler: app.authenticate,
//     schema: {
//       querystring: {
//         type: "object",
//         properties: {
//           date:             { type: "string" },   // YYYY-MM-DD (EAT); default today
//           phone_number_ids: { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getDaily(request.user.sub, resolveLang(request), q.date, parsePhoneIds(q.phone_number_ids));
//     return ok(reply, data);
//   });

//   app.get("/api/v1/analytics/monthly", {
//     preHandler: app.authenticate,
//     schema: {
//       querystring: {
//         type: "object",
//         properties: {
//           year:             { type: "integer", minimum: 2026 },
//           month:            { type: "integer", minimum: 1, maximum: 12 },
//           phone_number_ids: { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getMonthly(request.user.sub, resolveLang(request), q.year, q.month, parsePhoneIds(q.phone_number_ids));
//     return ok(reply, data);
//   });
// }

// export default fp(analyticsRoutes);