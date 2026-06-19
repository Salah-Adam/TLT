import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { FastifyError } from "fastify";
import { config } from "./config";
import jwtPlugin from "./jwt";
import authRoutes from "./routes/auth";
import phoneNumberRoutes from "./routes/phone-numbers";

const app = Fastify({
  logger: {
    level: "debug",
    transport: { target: "pino-pretty" },
  },
});

// ── Plugins ───────────────────────────────────────────────────────────────────
app.register(helmet);
app.register(cors, { origin: true });
app.register(jwtPlugin);

// ── Global error handler ──────────────────────────────────────────────────────
app.setErrorHandler((error: FastifyError, _request, reply) => {
  app.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: "Validation error",
      details: error.validation,
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    error: error.message ?? "Internal server error",
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Public — no auth needed
app.get("/health", async () => ({
  status: "ok",
  service: "api-server",
  timestamp: new Date().toISOString(),
}));

// Auth routes
app.register(authRoutes);

app.register(phoneNumberRoutes);


// ── Start ─────────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();

// import Fastify from "fastify";
// import cors from "@fastify/cors";
// import helmet from "@fastify/helmet";
// import { config } from "./config";
// import jwtPlugin from "./jwt";
// import { FastifyError } from "fastify";
// import authRoutes from "./routes/auth";

// // put this import at the top with the other imports

// const app = Fastify({
//   logger: {
//     level: "debug",
//     transport: { target: "pino-pretty" },
//   },
// });

// // ── Plugins ───────────────────────────────────────────────────────────────────

// // helmet: automatically adds HTTP security headers to every response
// // (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
// app.register(helmet);

// // cors: allows the mobile app and Postman to call the API
// app.register(cors, { origin: true });

// // jwt: registers app.authenticate — the preHandler used on every private route
// app.register(jwtPlugin);

// // ── Route registration ────────────────────────────────────────────────────────
// app.register(authRoutes);

// // ── Global error handler ──────────────────────────────────────────────────────
// // Without this, unhandled errors return Fastify's raw internal error format.
// // With this, every error — validation, auth failure, 500 — returns the same
// // clean JSON shape: { error: "..." }

// app.setErrorHandler((error: FastifyError, _request, reply) => {
//   app.log.error(error);

//   if (error.validation) {
//     return reply.status(400).send({
//       error: "Validation error",
//       details: error.validation,
//     });
//   }

//   const statusCode = error.statusCode ?? 500;
//   return reply.status(statusCode).send({
//     error: error.message ?? "Internal server error",
//   });
// });

// // ── Routes ────────────────────────────────────────────────────────────────────

// // Public — no auth needed
// app.get("/health", async () => ({
//   status: "ok",
//   service: "api-server",
//   timestamp: new Date().toISOString(),
// }));

// // ── Start ─────────────────────────────────────────────────────────────────────
// const start = async (): Promise<void> => {
//   try {
//     await app.listen({ port: config.server.port, host: config.server.host });
//   } catch (error) {
//     app.log.error(error);
//     process.exit(1);
//   }
// };



// start();








// import Fastify from 'fastify';
// import cors from '@fastify/cors';
// import dotenv from 'dotenv';

// dotenv.config();

// const server = Fastify({
//   logger: true
// });

// server.register(cors, {
//   origin: true
// });

// // Health check
// server.get('/health', async (request, reply) => {
//   return {
//     status: 'ok',
//     service: 'api-server',
//     timestamp: new Date().toISOString()
//   };
// });

// const start = async () => {
//   try {
//     const port = Number(process.env.PORT) || 3002;
//     const host = process.env.HOST || '0.0.0.0';
//     await server.listen({ port, host });
//     console.log(`API server running on port ${port}`);
//   } catch (err) {
//     server.log.error(err);
//     process.exit(1);
//   }
// };

// start();