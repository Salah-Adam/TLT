import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./db";

const app = buildApp();

beforeAll(async () => {
  await app.ready(); // makes app.jwt.sign available
});
beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await app.close();
});

// Seed a user + primary phone + one transaction; return the tx id and an access token.
async function seedUserWithTransaction() {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number)
     VALUES ('x', 'Del User', '252613334444') RETURNING id`
  );
  const userId = u[0].id;

  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;

  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active)
     VALUES ($1, '252613334444', $2, TRUE, TRUE) RETURNING id`,
    [userId, provider]
  );
  const phoneNumberId = pn[0].id;

  const { rows: tx } = await pool.query(
    `INSERT INTO transactions
       (phone_number_id, user_id, provider, amount, type, direction,
        transacted_at, transacted_date, transacted_hour, transacted_day_of_week,
        idempotency_key)
     VALUES ($1,$2,$3, 100, 'send', 'out',
             '2026-07-15T10:00:00Z', '2026-07-15', 10, 3, 'del-seed-1')
     RETURNING id`,
    [phoneNumberId, userId, provider]
  );

  const token = app.jwt.sign({ sub: userId, type: "access", lang: "so" });
  return { txId: tx[0].id, token };
}

describe("transactions: soft delete", () => {
  it("delete hides it from the list and surfaces it under /deleted", async () => {
    const { txId, token } = await seedUserWithTransaction();
    const auth = { authorization: `Bearer ${token}` };

    // Starts in the active list.
    const before = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: auth });
    expect(before.statusCode).toBe(200);
    expect(before.json().data).toHaveLength(1);

    // Soft delete.
    const del = await app.inject({ method: "DELETE", url: `/api/v1/transactions/${txId}`, headers: auth });
    expect(del.statusCode).toBe(200);
    expect(del.json().data.recoverable_until).toBeTruthy();

    // Gone from the active list.
    const after = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: auth });
    expect(after.json().data).toHaveLength(0);

    // Present in the deleted list.
    const deleted = await app.inject({ method: "GET", url: "/api/v1/transactions/deleted", headers: auth });
    expect(deleted.statusCode).toBe(200);
    const rows = deleted.json().data;
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(txId);
    expect(rows[0].amount).toBe(100);
  });

  it("rejects an unauthenticated delete", async () => {
    const { txId } = await seedUserWithTransaction();
    const res = await app.inject({ method: "DELETE", url: `/api/v1/transactions/${txId}` });
    expect(res.statusCode).toBe(401);
  });
});