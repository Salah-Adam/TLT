import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../../api-server/src/db";
import { recomputeMonthlySummary } from "../src/services/summaries";
import { resetDb } from "../../api-server/test/db";

const YEAR = 2026;
const MONTH = 7;

async function seedUserPhone() {
  const { rows: u } = await pool.query(
    `INSERT INTO users (password_hash, full_name, phone_number)
     VALUES ('x','U','252610000001') RETURNING id`
  );
  const userId = u[0].id;
  const { rows: p } = await pool.query(`SELECT code FROM providers LIMIT 1`);
  const provider = p[0].code;
  const { rows: pn } = await pool.query(
    `INSERT INTO phone_numbers (user_id, number, provider)
     VALUES ($1,'252610000001',$2) RETURNING id`, [userId, provider]
  );
  return { userId, phoneNumberId: pn[0].id, provider };
}

async function insertTx(
  ids: { userId: string; phoneNumberId: string; provider: string },
  t: { amount: number; direction: "in" | "out"; type: string; date: string; hour: number; key: string }
) {
  await pool.query(
    `INSERT INTO transactions
       (phone_number_id,user_id,provider,amount,type,direction,
        transacted_at,transacted_date,transacted_hour,transacted_day_of_week,idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6, $7,$8,$9, 3, $10)`,
    [ids.phoneNumberId, ids.userId, ids.provider, t.amount, t.type, t.direction,
     `${t.date}T${String(t.hour).padStart(2, "0")}:00:00Z`, t.date, t.hour, t.key]
  );
}

describe("recomputeMonthlySummary", () => {
  beforeEach(async () => { await resetDb(); });

  it("rolls a month into monthly_summaries with busiest day/hour + daily trend", async () => {
    const ids = await seedUserPhone();
    // Day 15 @10h: two IN (100, 50). Day 16 @14h: one IN (20), one OUT (30).
    await insertTx(ids, { amount: 100, direction: "in",  type: "receive", date: "2026-07-15", hour: 10, key: "a" });
    await insertTx(ids, { amount: 50,  direction: "in",  type: "receive", date: "2026-07-15", hour: 10, key: "b" });
    await insertTx(ids, { amount: 20,  direction: "in",  type: "receive", date: "2026-07-16", hour: 14, key: "c" });
    await insertTx(ids, { amount: 30,  direction: "out", type: "send",    date: "2026-07-16", hour: 14, key: "d" });

    const client = await pool.connect();
    try {
      await recomputeMonthlySummary(client, ids.userId, ids.phoneNumberId, YEAR, MONTH);
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      `SELECT total_in::float, total_out::float, net::float, transaction_count,
              busiest_day::text AS busiest_day, busiest_hour, daily_trend
       FROM monthly_summaries
       WHERE user_id=$1 AND phone_number_id=$2 AND summary_year=$3 AND summary_month=$4`,
      [ids.userId, ids.phoneNumberId, YEAR, MONTH]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      total_in: 170, total_out: 30, net: 140,
      transaction_count: 4,
      busiest_day: "2026-07-15", // both days have 2 tx; first-seen wins the tie
      busiest_hour: 10,
    });
    expect(rows[0].daily_trend).toHaveLength(2);
  });
});