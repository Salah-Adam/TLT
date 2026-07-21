//  only the active primary number can sign in

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import argon2 from "argon2";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./db";

const app = buildApp();
const PHONE = "252615550000";
const PASSWORD = "pw123456";

beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function seedNonPrimary() {
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number) VALUES ($1, 'U', $2) RETURNING id`,
    [hash, PHONE]
  );
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active)
     VALUES ($1, $2, $3, FALSE, TRUE) RETURNING id`,
    [u[0].id, PHONE, provider]
  );
  return { phoneNumberId: pn[0].id };
}

const login = () =>
  app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { phoneNumber: PHONE, password: PASSWORD } });

describe("login: only the active PRIMARY number can sign in", () => {
  it("rejects an active but non-primary number", async () => {
    await seedNonPrimary();
    const res = await login();
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("succeeds once that same number is made primary", async () => {
    const { phoneNumberId } = await seedNonPrimary();
    await pool.query(`UPDATE phone_numbers SET is_primary=TRUE WHERE id=$1`, [phoneNumberId]);
    const res = await login();
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBeTruthy();
  });
});