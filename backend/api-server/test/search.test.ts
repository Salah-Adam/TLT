import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { hashValue } from "../src/encryption";
import { resetDb } from "./db";

const app = buildApp();
const CP_PHONE = "252612345678";

beforeAll(async () => { await app.ready(); });
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

async function seedTxWithCounterparty() {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number)
     VALUES ('x','U','252619990000') RETURNING id`
  );
  const userId = u[0].id;
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active)
     VALUES ($1,'252619990000',$2,TRUE,TRUE) RETURNING id`, [userId, provider]
  );
  const { rows: tx } = await pool.query(
    `INSERT INTO transactions
       (phone_number_id,user_id,provider,amount,type,direction,
        transacted_at,transacted_date,transacted_hour,transacted_day_of_week,
        idempotency_key, counterparty_phone_hash)
     VALUES ($1,$2,$3,100,'send','out','2026-07-15T10:00:00Z','2026-07-15',10,3,'srch-1',$4) RETURNING id`,
    [pn[0].id, userId, provider, hashValue(CP_PHONE)]  // blind index = HMAC of the phone
  );
  return { txId: tx[0].id, token: app.jwt.sign({ sub: userId, type: "access", lang: "so" }) };
}

describe("transactions search: blind-index phone match (fast path)", () => {
  it("finds a transaction by exact counterparty phone, and misses on a different one", async () => {
    const { txId, token } = await seedTxWithCounterparty();
    const auth = { authorization: `Bearer ${token}` };

    const hit = await app.inject({ method: "GET", url: `/api/v1/transactions/search?q=${CP_PHONE}`, headers: auth });
    expect(hit.statusCode).toBe(200);
    expect(hit.json().data).toHaveLength(1);
    expect(hit.json().data[0].id).toBe(txId);

    const miss = await app.inject({ method: "GET", url: `/api/v1/transactions/search?q=252600000000`, headers: auth });
    expect(miss.json().data).toHaveLength(0);
  });
});