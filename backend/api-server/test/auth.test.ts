// The thing you're testing is your auth logic — "after verify, a user and an encryption‑key row exist and tokens come back." 
// That AWS KMS works is Amazon's job, not something your test suite should depend on a network for. Stubbing keeps the suite fast and runnable anywhere.


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
const PHONE = "252612345678";
const PASSWORD = "secret123";

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await app.close();
});

async function forceOtp(phone: string, purpose: string, code: string) {
  await pool.query(
    `UPDATE otp_challenges SET code_hash = $1
     WHERE phone_number = $2 AND purpose = $3 AND consumed_at IS NULL`,
    [hashValue(code), phone, purpose]
  );
}

/** register → set a known OTP → verify. Returns the verify response. */
async function registerAndVerify() {
  const reg = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { fullName: "Test User", phoneNumber: PHONE, password: PASSWORD },
  });
  expect(reg.statusCode).toBe(201);
  await forceOtp(PHONE, "registration", "123456");
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-otp",
    payload: { phoneNumber: PHONE, otp: "123456" },
  });
}

describe("auth: register → verify OTP → login", () => {
  it("creates the account and logs in with the same credentials", async () => {
    const verify = await registerAndVerify();
    expect(verify.statusCode).toBe(200);
    expect(verify.json().data.accessToken).toBeTruthy();
    expect(verify.json().data.refreshToken).toBeTruthy();

    const u = await pool.query(`SELECT id FROM users WHERE phone_number = $1`, [PHONE]);
    expect(u.rowCount).toBe(1);
    const k = await pool.query(`SELECT 1 FROM user_encryption_keys WHERE user_id = $1`, [u.rows[0].id]);
    expect(k.rowCount).toBe(1);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { phoneNumber: PHONE, password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().data.accessToken).toBeTruthy();
  });

  it("rejects login with the wrong password", async () => {
    await registerAndVerify();
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { phoneNumber: PHONE, password: "wrong-password" },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().success).toBe(false);
    expect(bad.json().error.code).toBe("INVALID_CREDENTIALS");
  });
});



// import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

// // ── Stub AWS KMS so the flow never makes a network call. ─────────────────────
// // createUserDek() (encryption.ts) imports these from ./kms; mocking the module
// // replaces them everywhere they're used.

// vi.mock("../src/kms", () => ({
//   generateDataKey: async () => ({
//     plaintextDek: Buffer.alloc(32, 1), // a fake 32-byte AES key
//     wrappedDek: "test-wrapped-dek",
//   }),
//   decryptDataKey: async () => Buffer.alloc(32, 1),
// }));

// import { buildApp } from "../src/app";
// import { pool } from "../src/db";
// import { hashValue } from "../src/encryption";
// import { resetDb } from "./db";

// const app = buildApp();
// const PHONE = "252612345678"; // 25261 prefix → evcplus, recognized provider
// const PASSWORD = "secret123";

// beforeEach(async () => {
//   await resetDb();
// });

// afterAll(async () => {
//   await app.close();
// });

// // The real OTP is random and stored hashed. Overwrite it with a KNOWN code,
// // hashed the same way the app hashes it, so the test can "receive" the code.
// async function forceOtp(phone: string, purpose: string, code: string) {
//   await pool.query(
//     `UPDATE otp_challenges SET code_hash = $1
//      WHERE phone_number = $2 AND purpose = $3 AND consumed_at IS NULL`,
//     [hashValue(code), phone, purpose]
//   );
// }

// describe("auth: register → verify OTP → login", () => {
//   it("creates the account and logs in with the same credentials", async () => {
//     // 1) Register — stages an OTP challenge; no user row yet.
//     const reg = await app.inject({
//       method: "POST",
//       url: "/api/v1/auth/register",
//       payload: { fullName: "Test User", phoneNumber: PHONE, password: PASSWORD },
//     });
//     expect(reg.statusCode).toBe(201);

//     await forceOtp(PHONE, "registration", "123456");

//     // 2) Verify OTP — creates user + primary phone + DEK, returns tokens.
//     const verify = await app.inject({
//       method: "POST",
//       url: "/api/v1/auth/verify-otp",
//       payload: { phoneNumber: PHONE, otp: "123456" },
//     });
//     expect(verify.statusCode).toBe(200);
//     const vBody = verify.json();
//     expect(vBody.success).toBe(true);
//     expect(vBody.data.accessToken).toBeTruthy();
//     expect(vBody.data.refreshToken).toBeTruthy();

//     // Side effects landed: user, and the (stubbed) encryption-key row.
//     const u = await pool.query(`SELECT id FROM users WHERE phone_number = $1`, [PHONE]);
//     expect(u.rowCount).toBe(1);
//     const k = await pool.query(`SELECT 1 FROM user_encryption_keys WHERE user_id = $1`, [u.rows[0].id]);
//     expect(k.rowCount).toBe(1);

//     // 3) Login with the same phone + password → fresh tokens.
//     const login = await app.inject({
//       method: "POST",
//       url: "/api/v1/auth/login",
//       payload: { phoneNumber: PHONE, password: PASSWORD },
//     });
//     expect(login.statusCode).toBe(200);
//     const lBody = login.json();
//     expect(lBody.success).toBe(true);
//     expect(lBody.data.accessToken).toBeTruthy();
//     expect(lBody.data.refreshToken).toBeTruthy();
//   });
// });