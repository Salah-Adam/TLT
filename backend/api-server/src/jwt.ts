import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "./config";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type: "access" | "refresh"; lang?: "en" | "so" };
    user:    { sub: string; type: "access" | "refresh"; lang?: "en" | "so" };
  }
}

// Who issues these tokens, and who is allowed to consume them.
const JWT_ISSUER = "tlt-api";
const JWT_AUDIENCE = "tlt-app";

export default fp(async (app: FastifyInstance) => {
  app.register(fastifyJwt, {
    secret: config.jwt.secret,
    sign: {
      algorithm: "HS256",       // pin the algorithm we sign with
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
    },
    verify: {
      algorithms: ["HS256"],    // ONLY accept HS256 — never "none" or a swapped algorithm
      allowedIss: JWT_ISSUER,
      allowedAud: JWT_AUDIENCE,
    },
  });

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

// declare module "@fastify/jwt" {
//   interface FastifyJWT {
//     payload: {
//       sub: string;
//       type: "access" | "refresh";
//       lang?: "en" | "so";
//     };
//     user: {
//       sub: string;
//       type: "access" | "refresh";
//       lang?: "en" | "so";
//     };
//   }
// }

// export default fp(async (app: FastifyInstance) => {
//   app.register(fastifyJwt, { secret: config.jwt.secret });

//   app.decorate(
//     "authenticate",
//     async (request: FastifyRequest, reply: FastifyReply) => {
//       try {
//         await request.jwtVerify();
//         if (request.user.type !== "access") {
//           return reply.status(401).send({
//             success: false,
//             error: { code: "INVALID_TOKEN_TYPE", message: "Invalid token type." },
//           });
//         }
//       } catch {
//         return reply.status(401).send({
//           success: false,
//           error: { code: "UNAUTHORIZED", message: "You are not authorized." },
//         });
//       }
//     }
//   );
// });
