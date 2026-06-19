import { SignOptions } from "@fastify/jwt";

export type JwtPayload = {
  sub: string;
  type: "access" | "refresh";
};

export type JwtSigner = (
  payload: JwtPayload,
  options?: Partial<SignOptions>
) => string;