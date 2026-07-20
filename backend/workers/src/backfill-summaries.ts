// ONE-TIME: recompute every daily + monthly summary from `transactions`, so existing rows get
// the category/hourly/busiest breakdowns that were previously empty. Idempotent — safe to re-run.
// Run:  docker exec TLT_workers node dist/backfill-summaries.js
import { pool } from "./db";
import { recomputeDailySummary, recomputeMonthlySummary } from "./services/summaries";

async function main() {
  const client = await pool.connect();
  try {
    const days = await client.query(
      `SELECT DISTINCT user_id, phone_number_id, transacted_date::text AS d
       FROM transactions ORDER BY d`
    );
    console.log(`Recomputing ${days.rowCount} daily summaries...`);
    for (const r of days.rows) {
      await recomputeDailySummary(client, r.user_id, r.phone_number_id, r.d);
    }

    const months = await client.query(
      `SELECT DISTINCT user_id, phone_number_id,
              EXTRACT(YEAR FROM transacted_date)::int  AS y,
              EXTRACT(MONTH FROM transacted_date)::int AS m
       FROM transactions ORDER BY y, m`
    );
    console.log(`Recomputing ${months.rowCount} monthly summaries...`);
    for (const r of months.rows) {
      await recomputeMonthlySummary(client, r.user_id, r.phone_number_id, r.y, r.m);
    }

    console.log("Backfill complete ✓");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("Backfill failed:", e); process.exit(1); });