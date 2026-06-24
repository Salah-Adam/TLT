import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as users from "../services/users";
import { ok, resolveLang } from "../lib/http";
import { t } from "../lib/messages";

async function userRoutes(app: FastifyInstance): Promise<void> {

  // ── Get own profile ────────────────────────────────────────────
  app.get("/api/v1/users/me", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, await users.getProfile(request.user.sub));
  });

  // ── Update profile ─────────────────────────────────────────────
  app.patch("/api/v1/users/me", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        properties: {
          full_name: { type: "string", minLength: 2, maxLength: 100 },
          email:     { type: ["string", "null"], maxLength: 255 },
          age:       { type: ["integer", "null"], minimum: 10, maximum: 100 },
          city:      { type: ["string", "null"], maxLength: 100 },
          sex:       { type: ["string", "null"], enum: ["male", "female", null] },
        },
      },
    },
  }, async (request, reply) => {
    const b = request.body as any;
    const updated = await users.updateProfile({
      userId: request.user.sub,
      fullName: b.full_name,
      email: b.email,
      age: b.age,
      city: b.city,
      sex: b.sex,
    });
    return ok(reply, updated);
  });

  // ── Change password ────────────────────────────────────────────
  app.post("/api/v1/users/me/change-password", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", minLength: 4 },
          newPassword:     { type: "string", minLength: 4 },
        },
      },
    },
  }, async (request, reply) => {
    const b = request.body as { currentPassword: string; newPassword: string };
    await users.changePassword(request.user.sub, b.currentPassword, b.newPassword);
    return ok(reply, { message: t("PASSWORD_CHANGED", resolveLang(request)) });
  });

  // ── Set language (re-issues access token) ──────────────────────
  app.patch("/api/v1/users/me/language", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["language"],
        properties: { language: { type: "string", enum: ["en", "so"] } },
      },
    },
  }, async (request, reply) => {
    const { language } = request.body as { language: "en" | "so" };
    const r = await users.setLanguage(request.user.sub, language, app.jwt.sign.bind(app.jwt));
    return ok(reply, r);
  });

  // ── Register device for push ───────────────────────────────────
  app.post("/api/v1/users/me/devices", {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["token"],
        properties: {
          token:    { type: "string", minLength: 1, maxLength: 255 },
          platform: { type: "string", enum: ["ios", "android"] },
        },
      },
    },
  }, async (request, reply) => {
    const b = request.body as { token: string; platform?: string };
    await users.registerDevice(request.user.sub, b.token, b.platform);
    return ok(reply, { message: t("DEVICE_REGISTERED", resolveLang(request)) }, 201);
  });
}

export default fp(userRoutes);