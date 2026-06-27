import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import * as categories from "../services/categories";
import { ok, resolveLang } from "../lib/http";

async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/categories", { preHandler: app.authenticate }, async (request, reply) => {
    return ok(reply, await categories.listCategories(request.user.sub, resolveLang(request)));
  });
}

export default fp(categoryRoutes);