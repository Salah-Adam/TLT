import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as phoneService from "../services/phone-numbers";
import * as authService from "../services/auth";

async function phoneNumberRoutes(app: FastifyInstance): Promise<void> {

  // ── Add (step 1) ───────────────────────────────────────────────
  app.post("/api/v1/phone-numbers", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["number"],
        properties: {
          number:         { type: "string", minLength: 6, maxLength: 20 },
          displayName:    { type: "string", maxLength: 100 },
          classification: { type: "string", enum: ["individual", "business"] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const result = await phoneService.addPhoneNumber({ userId, ...(request.body as any) });
    return reply.status(201).send(result);
  });

  // ── Verify (step 2) ────────────────────────────────────────────
  app.post("/api/v1/phone-numbers/verify", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["number", "otp"],
        properties: {
          number:         { type: "string", minLength: 6, maxLength: 20 },
          otp:            { type: "string", minLength: 6, maxLength: 6 },
          displayName:    { type: "string", maxLength: 100 },
          classification: { type: "string", enum: ["individual", "business"] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const result = await phoneService.verifyPhoneNumberOtp({ userId, ...(request.body as any) });
    return reply.status(200).send(result);
  });

  // ── Reclaim into THIS account (existing user, no password) ─────
  app.post("/api/v1/phone-numbers/reclaim", {
    preHandler: app.authenticate,
    schema: { body: { type: "object", required: ["number"], properties: { number: { type: "string", minLength: 6, maxLength: 20 } } } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { number } = request.body as { number: string };
    const result = await authService.reclaimNumberRequest({ userId, number });
    return reply.status(200).send(result);
  });

  app.post("/api/v1/phone-numbers/reclaim/verify", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["number", "otp"],
        properties: {
          number: { type: "string", minLength: 6, maxLength: 20 },
          otp:    { type: "string", minLength: 6, maxLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { number, otp } = request.body as { number: string; otp: string };
    const result = await authService.reclaimNumberVerify({ userId, number, otp });
    return reply.status(200).send(result);
  });

  // ── List ───────────────────────────────────────────────────────
  app.get("/api/v1/phone-numbers", { preHandler: app.authenticate }, async (request, reply) => {
    const numbers = await phoneService.listPhoneNumbers(request.user.sub);
    return reply.status(200).send({ data: numbers });
  });

  // ── Update ─────────────────────────────────────────────────────
  app.patch("/api/v1/phone-numbers/:id", {
    preHandler: app.authenticate,
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: {
        type: "object",
        properties: {
          displayName:    { type: "string", maxLength: 100 },
          classification: { type: "string", enum: ["individual", "business"] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { id: phoneNumberId } = request.params as { id: string };
    await phoneService.updatePhoneNumber({ userId, phoneNumberId, ...(request.body as any) });
    return reply.status(200).send({ message: "Updated successfully" });
  });

  // ── Delete ─────────────────────────────────────────────────────
  app.delete("/api/v1/phone-numbers/:id", {
    preHandler: app.authenticate,
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { id: phoneNumberId } = request.params as { id: string };
    const result = await phoneService.deletePhoneNumber(userId, phoneNumberId);
    return reply.status(200).send({
      message: result.accountDeleted ? "Phone number removed and account deleted" : "Phone number removed",
      accountDeleted: result.accountDeleted,
    });
  });
}

export default fp(phoneNumberRoutes);



// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as phoneService from "../services/phone-numbers";


// async function phoneNumberRoutes(app: FastifyInstance): Promise<void> {

//   // ── POST /api/v1/phone-numbers ──────────────────────────────────
//   // Add a new phone number — sends OTP for verification
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
//     const body = request.body as {
//       number: string;
//       displayName?: string;
//       classification?: "individual" | "business";
//     };

//     const result = await phoneService.addPhoneNumber({ userId, ...body });
//     return reply.status(201).send(result);
//   });

//   // ── POST /api/v1/phone-numbers/verify ──────────────────────────
//   // Verify OTP — activates the number and returns webhook token
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
//     const body = request.body as {
//       number: string;
//       otp: string;
//       displayName?: string;
//       classification?: "individual" | "business";
//     };

//     const result = await phoneService.verifyPhoneNumberOtp({ userId, ...body });
//     return reply.status(200).send(result);
//   });
  
//   // app.post("/api/v1/phone-numbers/verify", {
//   //   preHandler: app.authenticate,
//   //   schema: {
//   //     body: {
//   //       type: "object",
//   //       required: ["phoneNumberId", "otp"],
//   //       properties: {
//   //         phoneNumberId: { type: "string" },
//   //         otp:           { type: "string", minLength: 6, maxLength: 6 },
//   //       },
//   //     },
//   //   },
//   // }, async (request, reply) => {
//   //   const userId = request.user.sub;
//   //   const { phoneNumberId, otp } = request.body as {
//   //     phoneNumberId: string;
//   //     otp: string;
//   //   };

//   //   const result = await phoneService.verifyPhoneNumberOtp(userId, phoneNumberId, otp);
//   //   return reply.status(200).send(result);
//   // });

//   // ── GET /api/v1/phone-numbers ───────────────────────────────────
//   // List all phone numbers for the authenticated user
//   app.get("/api/v1/phone-numbers", {
//     preHandler: app.authenticate,
//   }, async (request, reply) => {
//     const userId = request.user.sub;
//     const numbers = await phoneService.listPhoneNumbers(userId);
//     return reply.status(200).send({ data: numbers });
//   });

//   // ── PATCH /api/v1/phone-numbers/:id ────────────────────────────
//   // Update display name or classification
//   app.patch("/api/v1/phone-numbers/:id", {
//     preHandler: app.authenticate,
//     schema: {
//       params: {
//         type: "object",
//         required: ["id"],
//         properties: {
//           id: { type: "string" },
//         },
//       },
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
//     const body = request.body as {
//       displayName?: string;
//       classification?: "individual" | "business";
//     };

//     await phoneService.updatePhoneNumber({ userId, phoneNumberId, ...body });
//     return reply.status(200).send({ message: "Updated successfully" });
//   });

//   // ── DELETE /api/v1/phone-numbers/:id ───────────────────────────
//   // Soft delete a phone number
//   app.delete("/api/v1/phone-numbers/:id", {
//     preHandler: app.authenticate,
//     schema: {
//       params: {
//         type: "object",
//         required: ["id"],
//         properties: {
//           id: { type: "string" },
//         },
//       },
//     },
//     }, async (request, reply) => {
//     const userId = request.user.sub;
//     const { id: phoneNumberId } = request.params as { id: string };

//     const result = await phoneService.deletePhoneNumber(userId, phoneNumberId);

//     if (result.accountDeleted) {
//       return reply.status(200).send({
//         message: "Phone number removed and account deleted",
//         accountDeleted: true,
//       });
//     }

//     return reply.status(200).send({
//       message: "Phone number removed",
//       accountDeleted: false,
//     });
//   });
//   // }, async (request, reply) => {
//   //   const userId = request.user.sub;
//   //   const { id: phoneNumberId } = request.params as { id: string };

//   //   await phoneService.deletePhoneNumber(userId, phoneNumberId);
//   //   return reply.status(200).send({ message: "Phone number removed" });
//   // });
// }

// export default fp(phoneNumberRoutes);