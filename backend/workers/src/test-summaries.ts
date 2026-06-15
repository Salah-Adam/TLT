import { pool } from "./db";
import { processTransactionJob } from "./processor";
import { createUserDek } from "./services/encryption";

function makeJob(phoneId: string, userId: string, type: string, amount: number, txnId: string, balance: number) {
  return {
    provider: "evcplus", phoneNumberId: phoneId, userId,
    receivedAt: new Date().toISOString(),
    structuredPayload: {
      event_id: `evt_${txnId}`, event_type: "transaction.completed",
      created_at: "2026-06-13T11:34:22Z", api_version: "2026-01-01",
      data: {
        transaction_id: txnId, channel: "EVC_PLUS", type,
        currency: "USD", amount, fee: 0.0, user_phone: "252610838368",
        counterparty: { phone: "252610838369", name: "TEST PARTY", type: "INDIVIDUAL" },
        user_running_balance: balance, status: "SUCCESS",
      },
    },
  };
}

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;
  let phoneId: string | undefined;

  try {
    await pool.query(
      `INSERT INTO providers (code, display_name, company_name)
       VALUES ('evcplus','EVC Plus','Hormuud') ON CONFLICT (code) DO NOTHING`
    );
    const u = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id`,
      [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]
    );
    userId = u.rows[0].id;
    await createUserDek(userId!);
    const p = await pool.query(
      `INSERT INTO phone_numbers (user_id, number, provider) VALUES ($1,$2,'evcplus') RETURNING id`,
      [userId, `2526${String(suffix).slice(-7)}`]
    );
    phoneId = p.rows[0].id;

    console.log("Processing 3 transactions: out 1, in 5, out 2 ...");
    await processTransactionJob(makeJob(phoneId!, userId!, "SEND_MONEY", 1, `TXNa${suffix}`, 7.36));
    await processTransactionJob(makeJob(phoneId!, userId!, "RECEIVE_MONEY", 5, `TXNb${suffix}`, 12.36));
    await processTransactionJob(makeJob(phoneId!, userId!, "SEND_MONEY", 2, `TXNc${suffix}`, 10.36));

    const daily = await pool.query(
      `SELECT total_in, total_out, net, transaction_count,
              transaction_count_in, transaction_count_out,
              largest_transaction_in, largest_transaction_out, closing_balance
       FROM daily_summaries WHERE phone_number_id = $1`, [phoneId]
    );
    console.log("DAILY  :", daily.rows[0]);

    const monthly = await pool.query(
      `SELECT summary_year, summary_month, total_in, total_out, net, transaction_count
       FROM monthly_summaries WHERE phone_number_id = $1`, [phoneId]
    );
    console.log("MONTHLY:", monthly.rows[0]);

    console.log("Re-processing the first transaction (duplicate)...");
    await processTransactionJob(makeJob(phoneId!, userId!, "SEND_MONEY", 1, `TXNa${suffix}`, 7.36));
    const d2 = await pool.query(
      `SELECT transaction_count FROM daily_summaries WHERE phone_number_id = $1`, [phoneId]
    );
    console.log("Daily count after duplicate:", d2.rows[0].transaction_count,
      Number(d2.rows[0].transaction_count) === 3 ? "✓ unchanged" : "✗");
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM daily_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM monthly_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM user_encryption_keys WHERE user_id=$1`, [userId]);
      if (phoneId) await pool.query(`DELETE FROM phone_numbers WHERE id=$1`, [phoneId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("3.3 test FAILED:", e); process.exit(1); });