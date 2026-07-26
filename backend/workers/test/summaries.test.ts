import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../src/db";
import { recomputeDailySummary } from "../src/services/summaries";
import { resetDb } from "./db";

const DATE = "2026-07-15";

async function seedUserPhone() {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number)
     VALUES ('x', 'Test User', '252610000001') RETURNING id`
  );
  const userId = u[0].id;
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider)
     VALUES ($1, '252610000001', $2) RETURNING id`,
    [userId, provider]
  );
  return { userId, phoneNumberId: pn[0].id, provider };
}

async function insertTx(
  ids: { userId: string; phoneNumberId: string; provider: string },
  t: { amount: number; direction: "in" | "out"; type: string; key: string }
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO transactions
       (phone_number_id, user_id, provider, amount, type, direction,
        transacted_at, transacted_date, transacted_hour, transacted_day_of_week,
        idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6, $7,$8, 10, 3, $9) RETURNING id`,
    [ids.phoneNumberId, ids.userId, ids.provider, t.amount, t.type, t.direction,
     `${DATE}T10:00:00Z`, DATE, t.key]
  );
  return rows[0].id;
}

async function recompute(userId: string, phoneNumberId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await recomputeDailySummary(client, userId, phoneNumberId, DATE);
  } finally {
    client.release();
  }
}

async function summaryCount(userId: string, phoneNumberId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM daily_summaries
     WHERE user_id=$1 AND phone_number_id=$2 AND summary_date=$3`,
    [userId, phoneNumberId, DATE]
  );
  return rows[0].n;
}

describe("recomputeDailySummary", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("aggregates a day's transactions into daily_summaries", async () => {
    const ids = await seedUserPhone();
    await insertTx(ids, { amount: 100, direction: "in",  type: "receive", key: "s1" });
    await insertTx(ids, { amount: 50,  direction: "in",  type: "receive", key: "s2" });
    await insertTx(ids, { amount: 30,  direction: "out", type: "send",    key: "s3" });

    await recompute(ids.userId, ids.phoneNumberId);

    const { rows } = await pool.query(
      `SELECT total_in::float, total_out::float, net::float,
              transaction_count, transaction_count_in, transaction_count_out,
              largest_transaction_in::float, largest_transaction_out::float
       FROM daily_summaries
       WHERE user_id=$1 AND phone_number_id=$2 AND summary_date=$3`,
      [ids.userId, ids.phoneNumberId, DATE]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      total_in: 150, total_out: 30, net: 120,
      transaction_count: 3, transaction_count_in: 2, transaction_count_out: 1,
      largest_transaction_in: 100, largest_transaction_out: 30,
    });
  });

it("keeps soft-deleted transactions in the analytics totals", async () => {
    const ids = await seedUserPhone();
    await insertTx(ids, { amount: 100, direction: "in",  type: "receive", key: "keep" });
    const softId = await insertTx(ids, { amount: 40, direction: "out", type: "send", key: "soft" });

    // Soft-delete one — exactly what the app does on a user delete.
    await pool.query(`UPDATE transactions SET is_deleted=TRUE, deleted_at=NOW() WHERE id=$1`, [softId]);

    await recompute(ids.userId, ids.phoneNumberId);

    const { rows } = await pool.query(
      `SELECT total_in::float, total_out::float, transaction_count
       FROM daily_summaries
       WHERE user_id=$1 AND phone_number_id=$2 AND summary_date=$3`,
      [ids.userId, ids.phoneNumberId, DATE]
    );
    // Analytics deliberately STILL counts the soft-deleted transaction.
    expect(rows[0]).toMatchObject({ total_in: 100, total_out: 40, transaction_count: 2 });
  });
});

