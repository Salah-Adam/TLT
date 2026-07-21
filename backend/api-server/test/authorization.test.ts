// Authorization isolation — user A cannot read/delete user B's transaction (should 404)	

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./db";

const app = buildApp();

beforeAll(async () => { await app.ready(); });
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function seedUser(phone: string) {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number) VALUES ('x', 'U', $1) RETURNING id`,
    [phone]
  );
  const userId = u[0].id;
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active)
     VALUES ($1, $2, $3, TRUE, TRUE) RETURNING id`,
    [userId, phone, provider]
  );
  const { rows: tx } = await pool.query(
    `INSERT INTO transactions
       (phone_number_id, user_id, provider, amount, type, direction,
        transacted_at, transacted_date, transacted_hour, transacted_day_of_week, idempotency_key)
     VALUES ($1,$2,$3, 100, 'send', 'out', '2026-07-15T10:00:00Z', '2026-07-15', 10, 3, $4)
     RETURNING id`,
    [pn[0].id, userId, provider, `key-${phone}`]
  );
  const token = app.jwt.sign({ sub: userId, type: "access", lang: "so" });
  return { userId, txId: tx[0].id, token };
}

describe("authorization: users are isolated from each other's data", () => {
  it("user A cannot read or delete user B's transaction", async () => {
    const a = await seedUser("252610000001");
    const b = await seedUser("252620000002");
    const asA = { authorization: `Bearer ${a.token}` };

    // Read B's tx as A → 404 (existence hidden, not 403).
    const read = await app.inject({ method: "GET", url: `/api/v1/transactions/${b.txId}`, headers: asA });
    expect(read.statusCode).toBe(404);

    // Delete B's tx as A → 404, and B's row is untouched.
    const del = await app.inject({ method: "DELETE", url: `/api/v1/transactions/${b.txId}`, headers: asA });
    expect(del.statusCode).toBe(404);
    const still = await pool.query(`SELECT is_deleted FROM transactions WHERE id=$1`, [b.txId]);
    expect(still.rows[0].is_deleted).toBe(false);

    // Sanity: B can read B's own tx.
    const okRead = await app.inject({
      method: "GET", url: `/api/v1/transactions/${b.txId}`,
      headers: { authorization: `Bearer ${b.token}` },
    });
    expect(okRead.statusCode).toBe(200);
  });
});