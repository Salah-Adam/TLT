import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "./config";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      type: "access" | "refresh";
      lang?: "en" | "so";
    };
    user: {
      sub: string;
      type: "access" | "refresh";
      lang?: "en" | "so";
    };
  }
}

export default fp(async (app: FastifyInstance) => {
  app.register(fastifyJwt, { secret: config.jwt.secret });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        if (request.user.type !== "access") {
          return reply.status(401).send({
            success: false,
            error: { code: "INVALID_TOKEN_TYPE", message: "Invalid token type." },
          });
        }
      } catch {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "You are not authorized." },
        });
      }
    }
  );
});


// import fp from "fastify-plugin";
// import fastifyJwt from "@fastify/jwt";
// import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// import { config } from "./config";

// // Extends @fastify/jwt's types so TypeScript knows the exact shape of
// // request.user in every route handler — no casting needed.
// declare module "@fastify/jwt" {
//   interface FastifyJWT {
//     payload: {
//       sub: string;            // user UUID
//       type: "access" | "refresh";
//     };
//     user: {
//       sub: string;
//       type: "access" | "refresh";
//     };
//   }
// }

// // fp() (fastify-plugin) makes the decorators we add here visible to the
// // whole app. Without fp(), app.authenticate would only exist inside this
// // plugin's scope and route files couldn't use it.
// export default fp(async (app: FastifyInstance) => {
//   app.register(fastifyJwt, {
//     secret: config.jwt.secret,
//   });

//   // app.authenticate is the reusable preHandler for protected routes.
//   // Usage in any route: { preHandler: app.authenticate }
//   app.decorate(
//     "authenticate",
//     async (request: FastifyRequest, reply: FastifyReply) => {
//       try {
//         await request.jwtVerify();

//         // Refresh tokens are valid JWTs but must only work on /auth/refresh.
//         // This check prevents a stolen refresh token from being used as an
//         // access token on transaction or settings routes.
//         if (request.user.type !== "access") {
//           return reply.status(401).send({ error: "Invalid token type" });
//         }
//       } catch {
//         return reply.status(401).send({ error: "Unauthorized" });
//       }
//     }
//   );
// });