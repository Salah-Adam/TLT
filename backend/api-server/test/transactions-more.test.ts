import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./db";

const app = buildApp();
beforeAll(async () => { await app.ready(); });
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function seedUserWithTx() {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number)
     VALUES ('x','U','252613334444') RETURNING id`
  );
  const userId = u[0].id;
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active)
     VALUES ($1,'252613334444',$2,TRUE,TRUE) RETURNING id`, [userId, provider]
  );
  const { rows: tx } = await pool.query(
    `INSERT INTO transactions
       (phone_number_id,user_id,provider,amount,type,direction,
        transacted_at,transacted_date,transacted_hour,transacted_day_of_week,idempotency_key)
     VALUES ($1,$2,$3,100,'send','out','2026-07-15T10:00:00Z','2026-07-15',10,3,'m1') RETURNING id`,
    [pn[0].id, userId, provider]
  );
  return { txId: tx[0].id, token: app.jwt.sign({ sub: userId, type: "access", lang: "so" }) };
}

// DELETE FROM users works because categories.user_id is always NULL today. 
// If you ever ship the custom‑categories feature, a user‑owned category would block that delete — 
// at which point resetDb would need a DELETE FROM categories WHERE user_id IS NOT NULL line first. Worth a

describe("transactions: update (category / note)", () => {
  it("sets a note and a category, clearing the auto-categorized flag", async () => {
    const { txId, token } = await seedUserWithTx();
    const auth = { authorization: `Bearer ${token}` };
    const { rows: cat } = await pool.query(`SELECT id FROM categories LIMIT 1`);
    const categoryId = cat[0].id;
    // const { rows: cat } = await pool.query(`SELECT id FROM categories WHERE user_id IS NULL LIMIT 1`);
    // const categoryId = cat[0].id;

    const res = await app.inject({
      method: "PATCH", url: `/api/v1/transactions/${txId}`, headers: auth,
      payload: { note: "lunch", category_id: categoryId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.note).toBe("lunch");
    expect(res.json().data.category.id).toBe(categoryId);

    const row = await pool.query(`SELECT note, category_id, is_auto_categorized FROM transactions WHERE id=$1`, [txId]);
    expect(row.rows[0]).toMatchObject({ note: "lunch", category_id: categoryId, is_auto_categorized: false });
  });

  it("rejects an unknown category with 404", async () => {
    const { txId, token } = await seedUserWithTx();
    const res = await app.inject({
      method: "PATCH", url: `/api/v1/transactions/${txId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { category_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("CATEGORY_NOT_FOUND");
  });
});

describe("transactions: recover a deleted transaction", () => {
  it("brings a soft-deleted transaction back into the active list", async () => {
    const { txId, token } = await seedUserWithTx();
    const auth = { authorization: `Bearer ${token}` };

    await app.inject({ method: "DELETE", url: `/api/v1/transactions/${txId}`, headers: auth });
    const rec = await app.inject({ method: "POST", url: `/api/v1/transactions/${txId}/recover`, headers: auth });
    expect(rec.statusCode).toBe(200);

    const active = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: auth });
    expect(active.json().data).toHaveLength(1);
    const deleted = await app.inject({ method: "GET", url: "/api/v1/transactions/deleted", headers: auth });
    expect(deleted.json().data).toHaveLength(0);
  });
});