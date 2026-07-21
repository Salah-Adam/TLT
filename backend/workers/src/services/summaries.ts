import { PoolClient } from "pg";

interface DailyInput {
  phoneNumberId: string; userId: string; summaryDate: string;
  isIn: boolean; amount: number; balanceAfter: number | null;
}

// --- these are used for recompute
// export async function updateDailySummary(client: PoolClient, d: DailyInput): Promise<void> {
//   const inAmt = d.isIn ? d.amount : 0;
//   const outAmt = d.isIn ? 0 : d.amount;
//   const net = d.isIn ? d.amount : -d.amount;
//   const cIn = d.isIn ? 1 : 0;
//   const cOut = d.isIn ? 0 : 1;
//   const largestIn = d.isIn ? d.amount : null;
//   const largestOut = d.isIn ? null : d.amount;

//   await client.query(
//     `INSERT INTO daily_summaries (
//        phone_number_id, user_id, summary_date,
//        total_in, total_out, net,
//        transaction_count, transaction_count_in, transaction_count_out,
//        largest_transaction_in, largest_transaction_out, closing_balance
//      ) VALUES ($1,$2,$3, $4,$5,$6, 1,$7,$8, $9,$10,$11)
//      ON CONFLICT (phone_number_id, summary_date) DO UPDATE SET
//        total_in  = daily_summaries.total_in  + EXCLUDED.total_in,
//        total_out = daily_summaries.total_out + EXCLUDED.total_out,
//        net       = daily_summaries.net       + EXCLUDED.net,
//        transaction_count     = daily_summaries.transaction_count     + 1,
//        transaction_count_in  = daily_summaries.transaction_count_in  + EXCLUDED.transaction_count_in,
//        transaction_count_out = daily_summaries.transaction_count_out + EXCLUDED.transaction_count_out,
//        largest_transaction_in = CASE
//          WHEN EXCLUDED.largest_transaction_in IS NULL THEN daily_summaries.largest_transaction_in
//          ELSE GREATEST(COALESCE(daily_summaries.largest_transaction_in, 0), EXCLUDED.largest_transaction_in) END,
//        largest_transaction_out = CASE
//          WHEN EXCLUDED.largest_transaction_out IS NULL THEN daily_summaries.largest_transaction_out
//          ELSE GREATEST(COALESCE(daily_summaries.largest_transaction_out, 0), EXCLUDED.largest_transaction_out) END,
//        closing_balance = COALESCE(EXCLUDED.closing_balance, daily_summaries.closing_balance),
//        updated_at = NOW()`,
//     [d.phoneNumberId, d.userId, d.summaryDate, inAmt, outAmt, net, cIn, cOut, largestIn, largestOut, d.balanceAfter]
//   );
// }

// interface MonthlyInput {
//   phoneNumberId: string; userId: string; year: number; month: number;
//   isIn: boolean; amount: number;
// }

// export async function updateMonthlySummary(client: PoolClient, d: MonthlyInput): Promise<void> {
//   const inAmt = d.isIn ? d.amount : 0;
//   const outAmt = d.isIn ? 0 : d.amount;
//   const net = d.isIn ? d.amount : -d.amount;
//   const cIn = d.isIn ? 1 : 0;
//   const cOut = d.isIn ? 0 : 1;
//   const largestIn = d.isIn ? d.amount : null;
//   const largestOut = d.isIn ? null : d.amount;

//   await client.query(
//     `INSERT INTO monthly_summaries (
//        phone_number_id, user_id, summary_year, summary_month,
//        total_in, total_out, net,
//        transaction_count, transaction_count_in, transaction_count_out,
//        largest_transaction_in, largest_transaction_out
//      ) VALUES ($1,$2,$3,$4, $5,$6,$7, 1,$8,$9, $10,$11)
//      ON CONFLICT (phone_number_id, summary_year, summary_month) DO UPDATE SET
//        total_in  = monthly_summaries.total_in  + EXCLUDED.total_in,
//        total_out = monthly_summaries.total_out + EXCLUDED.total_out,
//        net       = monthly_summaries.net       + EXCLUDED.net,
//        transaction_count     = monthly_summaries.transaction_count     + 1,
//        transaction_count_in  = monthly_summaries.transaction_count_in  + EXCLUDED.transaction_count_in,
//        transaction_count_out = monthly_summaries.transaction_count_out + EXCLUDED.transaction_count_out,
//        largest_transaction_in = CASE
//          WHEN EXCLUDED.largest_transaction_in IS NULL THEN monthly_summaries.largest_transaction_in
//          ELSE GREATEST(COALESCE(monthly_summaries.largest_transaction_in, 0), EXCLUDED.largest_transaction_in) END,
//        largest_transaction_out = CASE
//          WHEN EXCLUDED.largest_transaction_out IS NULL THEN monthly_summaries.largest_transaction_out
//          ELSE GREATEST(COALESCE(monthly_summaries.largest_transaction_out, 0), EXCLUDED.largest_transaction_out) END,
//        updated_at = NOW()`,
//     [d.phoneNumberId, d.userId, d.year, d.month, inAmt, outAmt, net, cIn, cOut, largestIn, largestOut]
//   );
// }

// -----------------

// ── RECOMPUTE (option A) ──────────────────────────────────────────
// Recompute a full day/month summary from `transactions` — totals + breakdowns.
// Keeps soft-deleted rows ("delete hides from the feed, not from analytics").
// Called by the worker on each new transaction, and by the api-server after edits.

// Track in/out counts separately so reads can reproduce "out-only" category counts exactly.
type Bucket = { in: number; out: number; countIn: number; countOut: number };
function bump(m: Record<string, Bucket>, key: string, isIn: boolean, amt: number): void {
  let b = m[key];
  if (!b) { b = { in: 0, out: 0, countIn: 0, countOut: 0 }; m[key] = b; }
  if (isIn) { b.in += amt; b.countIn++; } else { b.out += amt; b.countOut++; }
}

// type Bucket = { in: number; out: number; count: number };
// function bump(m: Record<string, Bucket>, key: string, isIn: boolean, amt: number): void {
//   let b = m[key];
//   if (!b) { b = { in: 0, out: 0, count: 0 }; m[key] = b; }
//   if (isIn) b.in += amt; else b.out += amt;
//   b.count++;
// }

export async function recomputeDailySummary(
  client: PoolClient, userId: string, phoneNumberId: string, summaryDate: string
): Promise<void> {
  const { rows } = await client.query(
    `SELECT direction, amount::float AS amount, balance_after::float AS balance_after,
            category_id, transacted_hour AS hr
     FROM transactions
     WHERE user_id=$1 AND phone_number_id=$2 AND transacted_date=$3
     ORDER BY transacted_at ASC, id ASC`,
    [userId, phoneNumberId, summaryDate]
  );

  if (rows.length === 0) {
    await client.query(
      `DELETE FROM daily_summaries WHERE user_id=$1 AND phone_number_id=$2 AND summary_date=$3`,
      [userId, phoneNumberId, summaryDate]
    );
    return;
  }

  let totalIn = 0, totalOut = 0, cIn = 0, cOut = 0;
  let largestIn: number | null = null, largestOut: number | null = null;
  let closingBalance: number | null = null;
  const cat: Record<string, Bucket> = {};
  const hourly: Record<string, Bucket> = {};

  for (const r of rows) {
    const isIn = r.direction === "in";
    const amt = r.amount ?? 0;
    if (isIn) { totalIn += amt; cIn++; largestIn = Math.max(largestIn ?? 0, amt); }
    else       { totalOut += amt; cOut++; largestOut = Math.max(largestOut ?? 0, amt); }
    if (r.balance_after != null) closingBalance = r.balance_after; // asc order → last non-null wins
    bump(cat, r.category_id ?? "uncategorized", isIn, amt);
    bump(hourly, String(r.hr ?? 0), isIn, amt);
  }

  await client.query(
    `INSERT INTO daily_summaries (
       phone_number_id, user_id, summary_date,
       total_in, total_out, net, transaction_count, transaction_count_in, transaction_count_out,
       largest_transaction_in, largest_transaction_out, closing_balance,
       category_breakdown, hourly_breakdown, updated_at
     ) VALUES ($1,$2,$3, $4,$5,$6, $7,$8,$9, $10,$11,$12, $13,$14, NOW())
     ON CONFLICT (phone_number_id, summary_date) DO UPDATE SET
       total_in=EXCLUDED.total_in, total_out=EXCLUDED.total_out, net=EXCLUDED.net,
       transaction_count=EXCLUDED.transaction_count,
       transaction_count_in=EXCLUDED.transaction_count_in,
       transaction_count_out=EXCLUDED.transaction_count_out,
       largest_transaction_in=EXCLUDED.largest_transaction_in,
       largest_transaction_out=EXCLUDED.largest_transaction_out,
       closing_balance=EXCLUDED.closing_balance,
       category_breakdown=EXCLUDED.category_breakdown,
       hourly_breakdown=EXCLUDED.hourly_breakdown,
       updated_at=NOW()`,
    [phoneNumberId, userId, summaryDate,
     totalIn, totalOut, totalIn - totalOut, rows.length, cIn, cOut,
     largestIn, largestOut, closingBalance,
     JSON.stringify(cat), JSON.stringify(hourly)]
  );
}

export async function recomputeMonthlySummary(
  client: PoolClient, userId: string, phoneNumberId: string, year: number, month: number
): Promise<void> {
  const { rows } = await client.query(
    `SELECT direction, amount::float AS amount, category_id,
            transacted_date::text AS d, transacted_hour AS hr
     FROM transactions
     WHERE user_id=$1 AND phone_number_id=$2
       AND transacted_date >= make_date($3,$4,1)
       AND transacted_date <  (make_date($3,$4,1) + INTERVAL '1 month')
     ORDER BY transacted_at ASC, id ASC`,
    [userId, phoneNumberId, year, month]
  );

  if (rows.length === 0) {
    await client.query(
      `DELETE FROM monthly_summaries WHERE user_id=$1 AND phone_number_id=$2 AND summary_year=$3 AND summary_month=$4`,
      [userId, phoneNumberId, year, month]
    );
    return;
  }

  let totalIn = 0, totalOut = 0, cIn = 0, cOut = 0;
  let largestIn: number | null = null, largestOut: number | null = null;
  const cat: Record<string, Bucket> = {};
  const hourly: Record<string, Bucket> = {};
  const perDay: Record<string, Bucket> = {};

  for (const r of rows) {
    const isIn = r.direction === "in";
    const amt = r.amount ?? 0;
    if (isIn) { totalIn += amt; cIn++; largestIn = Math.max(largestIn ?? 0, amt); }
    else       { totalOut += amt; cOut++; largestOut = Math.max(largestOut ?? 0, amt); }
    bump(cat, r.category_id ?? "uncategorized", isIn, amt);
    bump(hourly, String(r.hr ?? 0), isIn, amt);
    bump(perDay, r.d, isIn, amt);
  }

  // let busiestDay: string | null = null, bdCount = -1;
  // for (const [d, b] of Object.entries(perDay)) if (b.count > bdCount) { bdCount = b.count; busiestDay = d; }
  // let busiestHour: number | null = null, bhCount = -1;
  // for (const [h, b] of Object.entries(hourly)) if (b.count > bhCount) { bhCount = b.count; busiestHour = Number(h); }

  let busiestDay: string | null = null, bdCount = -1;
  for (const [d, b] of Object.entries(perDay)) { const c = b.countIn + b.countOut; if (c > bdCount) { bdCount = c; busiestDay = d; } }
  let busiestHour: number | null = null, bhCount = -1;
  for (const [h, b] of Object.entries(hourly)) { const c = b.countIn + b.countOut; if (c > bhCount) { bhCount = c; busiestHour = Number(h); } }

  // const dailyTrend = Object.entries(perDay)
  //   .map(([d, b]) => ({ date: d, total_in: b.in, total_out: b.out }))
  //   .sort((a, b) => (a.date < b.date ? -1 : 1));

  const dailyTrend = Object.entries(perDay)
    .map(([d, b]) => ({ date: d, total_in: b.in, total_out: b.out, count: b.countIn + b.countOut }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  await client.query(
    `INSERT INTO monthly_summaries (
       phone_number_id, user_id, summary_year, summary_month,
       total_in, total_out, net, transaction_count, transaction_count_in, transaction_count_out,
       largest_transaction_in, largest_transaction_out, busiest_day, busiest_hour,
       category_breakdown, hourly_breakdown, daily_trend, updated_at
     ) VALUES ($1,$2,$3,$4, $5,$6,$7, $8,$9,$10, $11,$12,$13,$14, $15,$16,$17, NOW())
     ON CONFLICT (phone_number_id, summary_year, summary_month) DO UPDATE SET
       total_in=EXCLUDED.total_in, total_out=EXCLUDED.total_out, net=EXCLUDED.net,
       transaction_count=EXCLUDED.transaction_count,
       transaction_count_in=EXCLUDED.transaction_count_in,
       transaction_count_out=EXCLUDED.transaction_count_out,
       largest_transaction_in=EXCLUDED.largest_transaction_in,
       largest_transaction_out=EXCLUDED.largest_transaction_out,
       busiest_day=EXCLUDED.busiest_day, busiest_hour=EXCLUDED.busiest_hour,
       category_breakdown=EXCLUDED.category_breakdown, hourly_breakdown=EXCLUDED.hourly_breakdown,
       daily_trend=EXCLUDED.daily_trend, updated_at=NOW()`,
    [phoneNumberId, userId, year, month,
     totalIn, totalOut, totalIn - totalOut, rows.length, cIn, cOut,
     largestIn, largestOut, busiestDay, busiestHour,
     JSON.stringify(cat), JSON.stringify(hourly), JSON.stringify(dailyTrend)]
  );
}