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
const A = "252611110000";   // owner's primary / identity number
const NUM = "252611112222"; // owner's SECONDARY number — the one being reclaimed

beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function forceOtp(phone: string, purpose: string, code: string) {
  await pool.query(
    `UPDATE otp_challenges SET code_hash=$1
     WHERE phone_number=$2 AND purpose=$3 AND consumed_at IS NULL`,
    [hashValue(code), phone, purpose]
  );
}

// Owner has TWO active numbers: primary A (their identity) and secondary NUM.
async function seedOwner(): Promise<{ ownerId: string }> {
  const hash = await argon2.hash("ownerpass", { type: argon2.argon2id });
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number) VALUES ($1,'Old Owner',$2) RETURNING id`,
    [hash, A]
  );
  const ownerId = u[0].id;
  await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
     VALUES ($1,$2,'evcplus',TRUE,TRUE,'tok-a')`, [ownerId, A]
  );
  await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
     VALUES ($1,$2,'evcplus',FALSE,TRUE,'tok-num')`, [ownerId, NUM]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1,'ownerhash', NOW() + INTERVAL '30 days')`, [ownerId]
  );
  return { ownerId };
}

describe("auth: public reclaim (previous owner keeps another number)", () => {
  it("moves only the reclaimed number; the owner stays active with their primary intact", async () => {
    const { ownerId } = await seedOwner();

    const req = await app.inject({
      method: "POST", url: "/api/v1/auth/reclaim",
      payload: { fullName: "New Owner", phoneNumber: NUM, password: "newpass123" },
    });
    expect(req.statusCode).toBe(200);

    await forceOtp(NUM, "reclaim", "123456");

    const verify = await app.inject({
      method: "POST", url: "/api/v1/auth/reclaim/verify",
      payload: { phoneNumber: NUM, otp: "123456" },
    });
    expect(verify.statusCode).toBe(200);

    // NUM now belongs to the new user (active, primary).
    const active = await pool.query(
      `SELECT user_id, is_primary FROM phone_numbers
       WHERE number=$1 AND is_active=TRUE AND deleted_at IS NULL`, [NUM]
    );
    expect(active.rowCount).toBe(1);
    const newUserId = active.rows[0].user_id;
    expect(newUserId).not.toBe(ownerId);
    expect(active.rows[0].is_primary).toBe(true);

    // Owner stays ACTIVE, identity number unchanged.
    const owner = await pool.query(`SELECT is_active, phone_number FROM users WHERE id=$1`, [ownerId]);
    expect(owner.rows[0]).toMatchObject({ is_active: true, phone_number: A });

    // Owner still holds A as their active primary.
    const aRow = await pool.query(
      `SELECT is_active, is_primary FROM phone_numbers WHERE user_id=$1 AND number=$2`, [ownerId, A]
    );
    expect(aRow.rows[0]).toMatchObject({ is_active: true, is_primary: true });

    // The reclaimed NUM row (owner's copy) is retired.
    const numRow = await pool.query(
      `SELECT is_active, reclaimed_by FROM phone_numbers WHERE user_id=$1 AND number=$2`, [ownerId, NUM]
    );
    expect(numRow.rows[0]).toMatchObject({ is_active: false, reclaimed_by: newUserId });

    // NOT deactivated → session NOT revoked.
    const tokens = await pool.query(`SELECT is_revoked FROM refresh_tokens WHERE user_id=$1`, [ownerId]);
    expect(tokens.rows.every((t) => t.is_revoked === false)).toBe(true);

    // Still notified.
    const notif = await pool.query(
      `SELECT 1 FROM notifications WHERE user_id=$1 AND type='number_reclaimed'`, [ownerId]
    );
    expect(notif.rowCount).toBe(1);

    // Owner logs in with A; new user logs in with NUM.
    const ownerLogin = await app.inject({
      method: "POST", url: "/api/v1/auth/login", payload: { phoneNumber: A, password: "ownerpass" },
    });
    expect(ownerLogin.statusCode).toBe(200);
    const newLogin = await app.inject({
      method: "POST", url: "/api/v1/auth/login", payload: { phoneNumber: NUM, password: "newpass123" },
    });
    expect(newLogin.statusCode).toBe(200);
  });
});