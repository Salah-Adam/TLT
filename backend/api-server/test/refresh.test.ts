import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

vi.mock("../src/kms", () => ({
  generateDataKey: async () => ({
    plaintextDek: Buffer.alloc(32, 1),
    wrappedDek: "test-wrapped-dek",
  }),
  decryptDataKey: async () => Buffer.alloc(32, 1),
}));

import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { hashValue } from "../src/encryption";
import { resetDb } from "./db";

const app = buildApp();
const PHONE = "252612349999";
const PASSWORD = "secret123";

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await app.close();
});

// register → set a known OTP → verify. Returns the issued { accessToken, refreshToken }.
async function registerAndVerify() {
  await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { fullName: "Test User", phoneNumber: PHONE, password: PASSWORD },
  });
  await pool.query(
    `UPDATE otp_challenges SET code_hash = $1
     WHERE phone_number = $2 AND purpose = 'registration' AND consumed_at IS NULL`,
    [hashValue("123456"), PHONE]
  );
  const verify = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-otp",
    payload: { phoneNumber: PHONE, otp: "123456" },
  });
  return verify.json().data as { accessToken: string; refreshToken: string };
}

describe("auth: refresh / logout", () => {
  it("refresh mints a new access token; logout then revokes the session", async () => {
    const { refreshToken } = await registerAndVerify();

    // 1) Refresh → a new access token; the refresh token itself stays valid.
    const r1 = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().data.accessToken).toBeTruthy();

    // 2) Logout → revokes that refresh token.
    const out = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: { refreshToken },
    });
    expect(out.statusCode).toBe(200);

    // 3) Refresh again with the now-revoked token → rejected.
    const r2 = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    expect(r2.statusCode).toBe(401);
    expect(r2.json().error.code).toBe("REFRESH_REVOKED");
  });

  it("rejects a garbage refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: "not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("REFRESH_INVALID");
  });
});