import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

vi.mock("../src/kms", () => ({
  generateDataKey: async () => ({ plaintextDek: Buffer.alloc(32, 1), wrappedDek: "test-wrapped-dek" }),
  decryptDataKey: async () => Buffer.alloc(32, 1),
}));

import argon2 from "argon2";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { hashValue } from "../src/encryption";
import { resetDb } from "./db";

const app = buildApp();
const NUM = "252611112222"; // 25261 → evcplus (a seeded provider code)

beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function forceOtp(phone: string, purpose: string, code: string) {
  await pool.query(
    `UPDATE otp_challenges SET code_hash=$1
     WHERE phone_number=$2 AND purpose=$3 AND consumed_at IS NULL`,
    [hashValue(code), phone, purpose]
  );
}

// The current owner: this is their ONLY number (their identity + active primary),
// plus a live refresh token we expect to be revoked when they're deactivated.
async function seedOwner(): Promise<{ ownerId: string }> {
  const hash = await argon2.hash("ownerpass", { type: argon2.argon2id });
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number) VALUES ($1,'Old Owner',$2) RETURNING id`,
    [hash, NUM]
  );
  const ownerId = u[0].id;
  await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
     VALUES ($1,$2,'evcplus',TRUE,TRUE,'owner-webhook')`,
    [ownerId, NUM]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1,'ownerhash', NOW() + INTERVAL '30 days')`,
    [ownerId]
  );
  return { ownerId };
}

describe("auth: public reclaim (previous owner had only this number)", () => {
  it("transfers the number, deactivates the old owner, revokes sessions, and notifies", async () => {
    const { ownerId } = await seedOwner();

    // 1) Reclaim request (a brand-new person). The number is active → allowed.
    const req = await app.inject({
      method: "POST", url: "/api/v1/auth/reclaim",
      payload: { fullName: "New Owner", phoneNumber: NUM, password: "newpass123" },
    });
    expect(req.statusCode).toBe(200);

    await forceOtp(NUM, "reclaim", "123456");

    // 2) Reclaim verify → new user, ownership transfer, tokens.
    const verify = await app.inject({
      method: "POST", url: "/api/v1/auth/reclaim/verify",
      payload: { phoneNumber: NUM, otp: "123456" },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().data.accessToken).toBeTruthy();

    // The ACTIVE row for NUM now belongs to a NEW user, as primary.
    const active = await pool.query(
      `SELECT user_id, is_primary FROM phone_numbers
       WHERE number=$1 AND is_active=TRUE AND deleted_at IS NULL`, [NUM]
    );
    expect(active.rowCount).toBe(1);
    const newUserId = active.rows[0].user_id;
    expect(newUserId).not.toBe(ownerId);
    expect(active.rows[0].is_primary).toBe(true);

    const nu = await pool.query(`SELECT full_name FROM users WHERE id=$1`, [newUserId]);
    expect(nu.rows[0].full_name).toBe("New Owner");

    // The old owner's row is retired and stamped with who reclaimed it.
    const oldRow = await pool.query(
      `SELECT is_active, is_primary, reclaimed_by FROM phone_numbers WHERE user_id=$1 AND number=$2`,
      [ownerId, NUM]
    );
    expect(oldRow.rows[0]).toMatchObject({ is_active: false, is_primary: false, reclaimed_by: newUserId });

    // Old owner had only this number → account deactivated + sessions revoked.
    const owner = await pool.query(`SELECT is_active FROM users WHERE id=$1`, [ownerId]);
    expect(owner.rows[0].is_active).toBe(false);
    const tokens = await pool.query(`SELECT is_revoked FROM refresh_tokens WHERE user_id=$1`, [ownerId]);
    expect(tokens.rows.every((t) => t.is_revoked)).toBe(true);

    // Previous owner was notified.
    const notif = await pool.query(
      `SELECT 1 FROM notifications WHERE user_id=$1 AND type='number_reclaimed'`, [ownerId]
    );
    expect(notif.rowCount).toBe(1);

    // The number now authenticates the NEW owner, not the old one.
    const newLogin = await app.inject({
      method: "POST", url: "/api/v1/auth/login", payload: { phoneNumber: NUM, password: "newpass123" },
    });
    expect(newLogin.statusCode).toBe(200);
    const oldLogin = await app.inject({
      method: "POST", url: "/api/v1/auth/login", payload: { phoneNumber: NUM, password: "ownerpass" },
    });
    expect(oldLogin.statusCode).toBe(401);
  });
});