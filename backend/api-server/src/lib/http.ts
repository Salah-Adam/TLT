// resolveLang (your exact rule) + the ok() success-envelope helper.

import { FastifyReply, FastifyRequest } from "fastify";
import { Lang } from "./messages";

const VALID: Lang[] = ["en", "so"];

/**
 * One language per request:
 *   1. authenticated user's account language (from the JWT)
 *   2. body.language (register / reclaim pick it there)
 *   3. Accept-Language header (login / verify / reset)
 *   4. default 'so'
 */
export function resolveLang(request: FastifyRequest): Lang {
  const fromUser = (request.user as any)?.lang;
  if (VALID.includes(fromUser)) return fromUser;

  const fromBody = (request.body as any)?.language;
  if (VALID.includes(fromBody)) return fromBody;

  const header = (request.headers["accept-language"] ?? "").toString().toLowerCase();
  if (header.startsWith("so")) return "so";
  if (header.startsWith("en")) return "en";

  return "so";
}

/** Standard success envelope: { success: true, data, meta? }. */
export function ok(reply: FastifyReply, data: unknown, status = 200, meta?: unknown): FastifyReply {
  const body: Record<string, unknown> = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return reply.status(status).send(body);
}