import { PoolClient } from "pg";

interface DailyInput {
  phoneNumberId: string; userId: string; summaryDate: string;
  isIn: boolean; amount: number; balanceAfter: number | null;
}

export async function updateDailySummary(client: PoolClient, d: DailyInput): Promise<void> {
  const inAmt = d.isIn ? d.amount : 0;
  const outAmt = d.isIn ? 0 : d.amount;
  const net = d.isIn ? d.amount : -d.amount;
  const cIn = d.isIn ? 1 : 0;
  const cOut = d.isIn ? 0 : 1;
  const largestIn = d.isIn ? d.amount : null;
  const largestOut = d.isIn ? null : d.amount;

  await client.query(
    `INSERT INTO daily_summaries (
       phone_number_id, user_id, summary_date,
       total_in, total_out, net,
       transaction_count, transaction_count_in, transaction_count_out,
       largest_transaction_in, largest_transaction_out, closing_balance
     ) VALUES ($1,$2,$3, $4,$5,$6, 1,$7,$8, $9,$10,$11)
     ON CONFLICT (phone_number_id, summary_date) DO UPDATE SET
       total_in  = daily_summaries.total_in  + EXCLUDED.total_in,
       total_out = daily_summaries.total_out + EXCLUDED.total_out,
       net       = daily_summaries.net       + EXCLUDED.net,
       transaction_count     = daily_summaries.transaction_count     + 1,
       transaction_count_in  = daily_summaries.transaction_count_in  + EXCLUDED.transaction_count_in,
       transaction_count_out = daily_summaries.transaction_count_out + EXCLUDED.transaction_count_out,
       largest_transaction_in = CASE
         WHEN EXCLUDED.largest_transaction_in IS NULL THEN daily_summaries.largest_transaction_in
         ELSE GREATEST(COALESCE(daily_summaries.largest_transaction_in, 0), EXCLUDED.largest_transaction_in) END,
       largest_transaction_out = CASE
         WHEN EXCLUDED.largest_transaction_out IS NULL THEN daily_summaries.largest_transaction_out
         ELSE GREATEST(COALESCE(daily_summaries.largest_transaction_out, 0), EXCLUDED.largest_transaction_out) END,
       closing_balance = COALESCE(EXCLUDED.closing_balance, daily_summaries.closing_balance),
       updated_at = NOW()`,
    [d.phoneNumberId, d.userId, d.summaryDate, inAmt, outAmt, net, cIn, cOut, largestIn, largestOut, d.balanceAfter]
  );
}

interface MonthlyInput {
  phoneNumberId: string; userId: string; year: number; month: number;
  isIn: boolean; amount: number;
}

export async function updateMonthlySummary(client: PoolClient, d: MonthlyInput): Promise<void> {
  const inAmt = d.isIn ? d.amount : 0;
  const outAmt = d.isIn ? 0 : d.amount;
  const net = d.isIn ? d.amount : -d.amount;
  const cIn = d.isIn ? 1 : 0;
  const cOut = d.isIn ? 0 : 1;
  const largestIn = d.isIn ? d.amount : null;
  const largestOut = d.isIn ? null : d.amount;

  await client.query(
    `INSERT INTO monthly_summaries (
       phone_number_id, user_id, summary_year, summary_month,
       total_in, total_out, net,
       transaction_count, transaction_count_in, transaction_count_out,
       largest_transaction_in, largest_transaction_out
     ) VALUES ($1,$2,$3,$4, $5,$6,$7, 1,$8,$9, $10,$11)
     ON CONFLICT (phone_number_id, summary_year, summary_month) DO UPDATE SET
       total_in  = monthly_summaries.total_in  + EXCLUDED.total_in,
       total_out = monthly_summaries.total_out + EXCLUDED.total_out,
       net       = monthly_summaries.net       + EXCLUDED.net,
       transaction_count     = monthly_summaries.transaction_count     + 1,
       transaction_count_in  = monthly_summaries.transaction_count_in  + EXCLUDED.transaction_count_in,
       transaction_count_out = monthly_summaries.transaction_count_out + EXCLUDED.transaction_count_out,
       largest_transaction_in = CASE
         WHEN EXCLUDED.largest_transaction_in IS NULL THEN monthly_summaries.largest_transaction_in
         ELSE GREATEST(COALESCE(monthly_summaries.largest_transaction_in, 0), EXCLUDED.largest_transaction_in) END,
       largest_transaction_out = CASE
         WHEN EXCLUDED.largest_transaction_out IS NULL THEN monthly_summaries.largest_transaction_out
         ELSE GREATEST(COALESCE(monthly_summaries.largest_transaction_out, 0), EXCLUDED.largest_transaction_out) END,
       updated_at = NOW()`,
    [d.phoneNumberId, d.userId, d.year, d.month, inAmt, outAmt, net, cIn, cOut, largestIn, largestOut]
  );
}