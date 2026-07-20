import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as analytics from "../services/analytics";
import { ok, resolveLang } from "../lib/http";

const parseIds = (q: any): string[] | undefined =>
  q.phone_number_ids ? String(q.phone_number_ids).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;
const phoneProp = { phone_number_ids: { type: "string" } };

async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/analytics/dashboard", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { ...phoneProp } } },
  }, async (request, reply) => ok(reply, await analytics.getDashboard(request.user.sub, parseIds(request.query))));

  app.get("/api/v1/analytics/daily", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { date: { type: "string" }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await analytics.getDaily(request.user.sub, resolveLang(request), q.date, parseIds(q)));
  });

  app.get("/api/v1/analytics/weekly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: { start: { type: "string" }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await analytics.getWeekly(request.user.sub, resolveLang(request), q.start, parseIds(q)));
  });

  app.get("/api/v1/analytics/monthly", {
    preHandler: app.authenticate,
    schema: { querystring: { type: "object", properties: {
      year: { type: "integer", minimum: 2026 }, month: { type: "integer", minimum: 1, maximum: 12 }, ...phoneProp } } },
  }, async (request, reply) => {
    const q = request.query as any;
    return ok(reply, await analytics.getMonthly(request.user.sub, resolveLang(request), q.year, q.month, parseIds(q)));
  });
}

export default fp(analyticsRoutes);


// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as analytics from "../services/analytics";
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

// const scopeProps = {
//   phone_number_ids: { type: "string" },
//   provider:         { type: "string" },
//   type:             { type: "string", enum: TX_TYPES },
//   category_id:      { type: "string" },
// };

// async function analyticsRoutes(app: FastifyInstance): Promise<void> {

//   app.get("/api/v1/analytics/dashboard", {
//     preHandler: app.authenticate,
//     schema: { querystring: { type: "object", properties: { ...scopeProps } } },
//   }, async (request, reply) => {
//     const data = await analytics.getDashboard(request.user.sub, buildScope(request.query as any));
//     return ok(reply, data);
//   });

//   app.get("/api/v1/analytics/daily", {
//     preHandler: app.authenticate,
//     schema: { querystring: { type: "object", properties: { date: { type: "string" }, ...scopeProps } } },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getDaily(request.user.sub, resolveLang(request), q.date, buildScope(q));
//     return ok(reply, data);
//   });

//   app.get("/api/v1/analytics/weekly", {
//     preHandler: app.authenticate,
//     schema: { querystring: { type: "object", properties: { start: { type: "string" }, ...scopeProps } } },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getWeekly(request.user.sub, resolveLang(request), q.start, buildScope(q));
//     return ok(reply, data);
//   });

//   app.get("/api/v1/analytics/monthly", {
//     preHandler: app.authenticate,
//     schema: {
//       querystring: {
//         type: "object",
//         properties: {
//           year:  { type: "integer", minimum: 2026 },
//           month: { type: "integer", minimum: 1, maximum: 12 },
//           ...scopeProps,
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const q = request.query as any;
//     const data = await analytics.getMonthly(request.user.sub, resolveLang(request), q.year, q.month, buildScope(q));
//     return ok(reply, data);
//   });
// }

// export default fp(analyticsRoutes);
