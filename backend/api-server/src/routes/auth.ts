import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as authService from "../services/auth";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

async function authRoutes(app: FastifyInstance): Promise<void> {

  app.post("/api/v1/auth/register", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: { body: {
      type: "object", required: ["fullName", "phoneNumber", "password"],
      properties: {
        fullName:    { type: "string", minLength: 2, maxLength: 100 },
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        password:    { type: "string", minLength: 4 },
        language:    { type: "string", enum: ["en", "so"] },
      },
    } },
  }, async (request, reply) => {
    const result = await authService.register(request.body as any);
    return ok(reply, result, 201);
  });

  app.post("/api/v1/auth/verify-otp", {
    schema: { body: {
      type: "object", required: ["phoneNumber", "otp"],
      properties: {
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        otp:         { type: "string", minLength: 6, maxLength: 6 },
        deviceInfo:  { type: "string" },
      },
    } },
  }, async (request, reply) => {
    const b = request.body as { phoneNumber: string; otp: string; deviceInfo?: string };
    const result = await authService.verifyRegistrationOtp(b.phoneNumber, b.otp, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip);
    return ok(reply, result);
  });

  app.post("/api/v1/auth/login", {
    schema: { body: {
      type: "object", required: ["phoneNumber", "password"],
      properties: { phoneNumber: { type: "string" }, password: { type: "string" }, deviceInfo: { type: "string" } },
    } },
  }, async (request, reply) => {
    const b = request.body as { phoneNumber: string; password: string; deviceInfo?: string };
    const result = await authService.login({ ...b, ipAddress: request.ip }, app.jwt.sign.bind(app.jwt));
    return ok(reply, result);
  });

  app.post("/api/v1/auth/refresh", {
    schema: { body: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } },
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const result = await authService.refresh(refreshToken, app.jwt.sign.bind(app.jwt));
    return ok(reply, result);
  });

  app.post("/api/v1/auth/logout", {
    schema: { body: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } },
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    await authService.logout(refreshToken);
    return ok(reply, { message: t("LOGGED_OUT", resolveLang(request)) });
  });

  app.post("/api/v1/auth/forgot-password", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: { body: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string" } } } },
  }, async (request, reply) => {
    const { phoneNumber } = request.body as { phoneNumber: string };
    await authService.forgotPassword(phoneNumber);
    return ok(reply, { message: t("FORGOT_PASSWORD_SENT", resolveLang(request)) });
  });

  app.post("/api/v1/auth/reset-password", {
    schema: { body: {
      type: "object", required: ["phoneNumber", "otp", "newPassword"],
      properties: {
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        otp:         { type: "string", minLength: 6, maxLength: 6 },
        newPassword: { type: "string", minLength: 4 },
        deviceInfo:  { type: "string" },
      },
    } },
  }, async (request, reply) => {
    const b = request.body as { phoneNumber: string; otp: string; newPassword: string; deviceInfo?: string };
    const result = await authService.resetPassword(b.phoneNumber, b.otp, b.newPassword, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip);
    return ok(reply, result);
  });

  app.post("/api/v1/auth/reclaim", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: { body: {
      type: "object", required: ["fullName", "phoneNumber", "password"],
      properties: {
        fullName:    { type: "string", minLength: 2, maxLength: 100 },
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        password:    { type: "string", minLength: 4 },
        language:    { type: "string", enum: ["en", "so"] },
      },
    } },
  }, async (request, reply) => {
    const result = await authService.reclaimRequest(request.body as any);
    return ok(reply, result);
  });

  app.post("/api/v1/auth/reclaim/verify", {
    schema: { body: {
      type: "object", required: ["phoneNumber", "otp"],
      properties: {
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        otp:         { type: "string", minLength: 6, maxLength: 6 },
        deviceInfo:  { type: "string" },
      },
    } },
  }, async (request, reply) => {
    const b = request.body as { phoneNumber: string; otp: string; deviceInfo?: string };
    const result = await authService.reclaimVerify(b.phoneNumber, b.otp, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip);
    return ok(reply, result);
  });


  app.post("/api/v1/auth/recover", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: { body: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string", minLength: 6, maxLength: 12 } } } },
  }, async (request, reply) => {
    const { phoneNumber } = request.body as { phoneNumber: string };
    const result = await authService.recoverRequest(phoneNumber);
    return ok(reply, result);
  });

  app.post("/api/v1/auth/recover/verify", {
    schema: { body: {
      type: "object", required: ["phoneNumber", "otp", "newPassword"],
      properties: {
        phoneNumber: { type: "string", minLength: 6, maxLength: 12 },
        otp:         { type: "string", minLength: 6, maxLength: 6 },
        newPassword: { type: "string", minLength: 4 },
        deviceInfo:  { type: "string" },
      },
    } },
  }, async (request, reply) => {
    const b = request.body as { phoneNumber: string; otp: string; newPassword: string; deviceInfo?: string };
    const result = await authService.recoverVerify(b.phoneNumber, b.otp, b.newPassword, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip);
    return ok(reply, result);
  });
}

export default fp(authRoutes);


// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";
// import * as authService from "../services/auth";

// async function authRoutes(app: FastifyInstance): Promise<void> {

//   // ── Register (step 1) ──────────────────────────────────────────
//   app.post("/api/v1/auth/register", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["fullName", "phoneNumber", "password"],
//         properties: {
//           fullName:    { type: "string", minLength: 2, maxLength: 100 },
//           phoneNumber: { type: "string", minLength: 6, maxLength: 20 },
//           password:    { type: "string", minLength: 4 },
//           language:    { type: "string", enum: ["en", "so"] },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const result = await authService.register(request.body as any);
//     return reply.status(201).send(result);
//   });

//   // ── Verify OTP (step 2) ────────────────────────────────────────
//   app.post("/api/v1/auth/verify-otp", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["phoneNumber", "otp"],
//         properties: {
//           phoneNumber: { type: "string", minLength: 6, maxLength: 20 },
//           otp:         { type: "string", minLength: 6, maxLength: 6 },
//           deviceInfo:  { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const b = request.body as { phoneNumber: string; otp: string; deviceInfo?: string };
//     const result = await authService.verifyRegistrationOtp(
//       b.phoneNumber, b.otp, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip
//     );
//     return reply.status(200).send(result);
//   });

//   // ── Login ──────────────────────────────────────────────────────
//   app.post("/api/v1/auth/login", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["phoneNumber", "password"],
//         properties: {
//           phoneNumber: { type: "string" },
//           password:    { type: "string" },
//           deviceInfo:  { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const b = request.body as { phoneNumber: string; password: string; deviceInfo?: string };
//     const result = await authService.login({ ...b, ipAddress: request.ip }, app.jwt.sign.bind(app.jwt));
//     return reply.status(200).send(result);
//   });

//   // ── Refresh ────────────────────────────────────────────────────
//   app.post("/api/v1/auth/refresh", {
//     schema: { body: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } },
//   }, async (request, reply) => {
//     const { refreshToken } = request.body as { refreshToken: string };
//     const result = await authService.refresh(refreshToken, app.jwt.sign.bind(app.jwt));
//     return reply.status(200).send(result);
//   });

//   // ── Logout ─────────────────────────────────────────────────────
//   app.post("/api/v1/auth/logout", {
//     schema: { body: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } },
//   }, async (request, reply) => {
//     const { refreshToken } = request.body as { refreshToken: string };
//     await authService.logout(refreshToken);
//     return reply.status(200).send({ message: "Logged out successfully" });
//   });

//   // ── Forgot password ────────────────────────────────────────────
//   app.post("/api/v1/auth/forgot-password", {
//     schema: { body: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string" } } } },
//   }, async (request, reply) => {
//     const { phoneNumber } = request.body as { phoneNumber: string };
//     await authService.forgotPassword(phoneNumber);
//     return reply.status(200).send({ message: "If this number is registered, an OTP has been sent." });
//   });

//   // ── Reset password ─────────────────────────────────────────────
//   app.post("/api/v1/auth/reset-password", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["phoneNumber", "otp", "newPassword"],
//         properties: {
//           phoneNumber: { type: "string", minLength: 6, maxLength: 20 },
//           otp:         { type: "string", minLength: 6, maxLength: 6 },
//           newPassword: { type: "string", minLength: 4 },
//           deviceInfo:  { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const b = request.body as { phoneNumber: string; otp: string; newPassword: string; deviceInfo?: string };
//     const result = await authService.resetPassword(
//       b.phoneNumber, b.otp, b.newPassword, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip
//     );
//     return reply.status(200).send(result);
//   });

//   // ── Reclaim (public — new user takes over a number) ────────────
//   app.post("/api/v1/auth/reclaim", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["fullName", "phoneNumber", "password"],
//         properties: {
//           fullName:    { type: "string", minLength: 2, maxLength: 100 },
//           phoneNumber: { type: "string", minLength: 6, maxLength: 20 },
//           password:    { type: "string", minLength: 4 },
//           language:    { type: "string", enum: ["en", "so"] },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const result = await authService.reclaimRequest(request.body as any);
//     return reply.status(200).send(result);
//   });

//   app.post("/api/v1/auth/reclaim/verify", {
//     schema: {
//       body: {
//         type: "object",
//         required: ["phoneNumber", "otp"],
//         properties: {
//           phoneNumber: { type: "string", minLength: 6, maxLength: 20 },
//           otp:         { type: "string", minLength: 6, maxLength: 6 },
//           deviceInfo:  { type: "string" },
//         },
//       },
//     },
//   }, async (request, reply) => {
//     const b = request.body as { phoneNumber: string; otp: string; deviceInfo?: string };
//     const result = await authService.reclaimVerify(
//       b.phoneNumber, b.otp, app.jwt.sign.bind(app.jwt), b.deviceInfo, request.ip
//     );
//     return reply.status(200).send(result);
//   });
// }

// export default fp(authRoutes);

