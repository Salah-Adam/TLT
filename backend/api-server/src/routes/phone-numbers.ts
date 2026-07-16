import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as phoneService from "../services/phone-numbers";
import * as authService from "../services/auth";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

async function phoneNumberRoutes(app: FastifyInstance): Promise<void> {

  app.post("/api/v1/phone-numbers", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: app.authenticate,
    schema: { body: {
      type: "object", required: ["number"],
      properties: {
        number:         { type: "string", minLength: 6, maxLength: 20 },
        displayName:    { type: "string", maxLength: 100 },
        classification: { type: "string", enum: ["individual", "business"] },
      },
    } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    await phoneService.addPhoneNumber({ userId, ...(request.body as any) });
    return ok(reply, { message: t("OTP_SENT", resolveLang(request)) }, 201);
  });

  app.post("/api/v1/phone-numbers/verify", {
    preHandler: app.authenticate,
    schema: { body: {
      type: "object", required: ["number", "otp"],
      properties: {
        number:         { type: "string", minLength: 6, maxLength: 20 },
        otp:            { type: "string", minLength: 6, maxLength: 6 },
        displayName:    { type: "string", maxLength: 100 },
        classification: { type: "string", enum: ["individual", "business"] },
      },
    } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const result = await phoneService.verifyPhoneNumberOtp({ userId, ...(request.body as any) });
    return ok(reply, result);
  });

  app.post("/api/v1/phone-numbers/reclaim", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: app.authenticate,
    schema: { body: { type: "object", required: ["number"], properties: { number: { type: "string", minLength: 6, maxLength: 20 } } } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { number } = request.body as { number: string };
    await authService.reclaimNumberRequest({ userId, number });
    return ok(reply, { message: t("OTP_SENT_RECLAIM", resolveLang(request)) });
  });

  app.post("/api/v1/phone-numbers/reclaim/verify", {
    preHandler: app.authenticate,
    schema: { body: {
      type: "object", required: ["number", "otp"],
      properties: { number: { type: "string", minLength: 6, maxLength: 20 }, otp: { type: "string", minLength: 6, maxLength: 6 } },
    } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { number, otp } = request.body as { number: string; otp: string };
    const result = await authService.reclaimNumberVerify({ userId, number, otp });
    return ok(reply, result);
  });

  app.get("/api/v1/phone-numbers", { preHandler: app.authenticate }, async (request, reply) => {
    const numbers = await phoneService.listPhoneNumbers(request.user.sub);
    return ok(reply, numbers);
  });

  app.patch("/api/v1/phone-numbers/:id", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: { type: "object", properties: {
        displayName:    { type: "string", maxLength: 100 },
        classification: { type: "string", enum: ["individual", "business"] },
      } },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { id: phoneNumberId } = request.params as { id: string };
    await phoneService.updatePhoneNumber({ userId, phoneNumberId, ...(request.body as any) });
    return ok(reply, { message: t("PHONE_UPDATED", resolveLang(request)) });
  });

  app.delete("/api/v1/phone-numbers/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { id: phoneNumberId } = request.params as { id: string };
    const result = await phoneService.deletePhoneNumber(userId, phoneNumberId);
    const code = result.accountDeleted ? "PHONE_REMOVED_ACCOUNT_DELETED" : "PHONE_REMOVED";
    return ok(reply, { message: t(code, resolveLang(request)), accountDeleted: result.accountDeleted });
  });
}

export default fp(phoneNumberRoutes);



// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as phoneService from "../services/phone-numbers";
// import * as authService from "../services/auth";

// async function phoneNumberRoutes(app: FastifyInstance): Promise<void> {

//   // ── Add (step 1) ───────────────────────────────────────────────
//   app.post("/api/v1/phone-numbers", {
//     preHandler: app.authenticate,
//     schema: {
//       body: {
//         type: "object",
//         required: ["number"],
//         properties: {
//           number:         { type: "string", minLength: 6, maxLength: 20 },
//           displayName:    { type: "string", maxLength: 100 },
//           classification: { type: "string", enum: ["individual", "business"] },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const result = await phoneService.addPhoneNumber({ userId, ...(request.body as any) });
//     return reply.status(201).send(result);
//   });

//   // ── Verify (step 2) ────────────────────────────────────────────
//   app.post("/api/v1/phone-numbers/verify", {
//     preHandler: app.authenticate,
//     schema: {
//       body: {
//         type: "object",
//         required: ["number", "otp"],
//         properties: {
//           number:         { type: "string", minLength: 6, maxLength: 20 },
//           otp:            { type: "string", minLength: 6, maxLength: 6 },
//           displayName:    { type: "string", maxLength: 100 },
//           classification: { type: "string", enum: ["individual", "business"] },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const result = await phoneService.verifyPhoneNumberOtp({ userId, ...(request.body as any) });
//     return reply.status(200).send(result);
//   });

//   // ── Reclaim into THIS account (existing user, no password) ─────
//   app.post("/api/v1/phone-numbers/reclaim", {
//     preHandler: app.authenticate,
//     schema: { body: { type: "object", required: ["number"], properties: { number: { type: "string", minLength: 6, maxLength: 20 } } } },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const { number } = request.body as { number: string };
//     const result = await authService.reclaimNumberRequest({ userId, number });
//     return reply.status(200).send(result);
//   });

//   app.post("/api/v1/phone-numbers/reclaim/verify", {
//     preHandler: app.authenticate,
//     schema: {
//       body: {
//         type: "object",
//         required: ["number", "otp"],
//         properties: {
//           number: { type: "string", minLength: 6, maxLength: 20 },
//           otp:    { type: "string", minLength: 6, maxLength: 6 },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const { number, otp } = request.body as { number: string; otp: string };
//     const result = await authService.reclaimNumberVerify({ userId, number, otp });
//     return reply.status(200).send(result);
//   });

//   // ── List ───────────────────────────────────────────────────────
//   app.get("/api/v1/phone-numbers", { preHandler: app.authenticate }, async (request, reply) => {
//     const numbers = await phoneService.listPhoneNumbers(request.user.sub);
//     return reply.status(200).send({ data: numbers });
//   });

//   // ── Update ─────────────────────────────────────────────────────
//   app.patch("/api/v1/phone-numbers/:id", {
//     preHandler: app.authenticate,
//     schema: {
//       params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
//       body: {
//         type: "object",
//         properties: {
//           displayName:    { type: "string", maxLength: 100 },
//           classification: { type: "string", enum: ["individual", "business"] },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const { id: phoneNumberId } = request.params as { id: string };
//     await phoneService.updatePhoneNumber({ userId, phoneNumberId, ...(request.body as any) });
//     return reply.status(200).send({ message: "Updated successfully" });
//   });

//   // ── Delete ─────────────────────────────────────────────────────
//   app.delete("/api/v1/phone-numbers/:id", {
//     preHandler: app.authenticate,
//     schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const { id: phoneNumberId } = request.params as { id: string };
//     const result = await phoneService.deletePhoneNumber(userId, phoneNumberId);
//     return reply.status(200).send({
//       message: result.accountDeleted ? "Phone number removed and account deleted" : "Phone number removed",
//       accountDeleted: result.accountDeleted,
//     });
//   });
// }

// export default fp(phoneNumberRoutes);
