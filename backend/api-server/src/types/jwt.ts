import { SignOptions } from "@fastify/jwt";
import { Lang } from "../lib/messages";

export type JwtPayload = {
  sub: string;
  type: "access" | "refresh";
  lang?: Lang;
};

export type JwtSigner = (
  payload: JwtPayload,
  options?: Partial<SignOptions>
) => string;