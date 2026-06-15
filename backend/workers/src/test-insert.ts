import { pool } from "./db";
import { processTransactionJob } from "./processor";
import { createUserDek, getUserDek, decryptField } from "./services/encryption";

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;
  let phoneId: string | undefined;

  try {
    await pool.query(
        `INSERT INTO providers (code, display_name, company_name)
        VALUES ('evcplus', 'EVC Plus', 'Hormuud')
        ON CONFLICT (code) DO NOTHING`
    );

    const u = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1,$2,$3) RETURNING id`,
      [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]
    );
    userId = u.rows[0].id;
    await createUserDek(userId!);

    const p = await pool.query(
      `INSERT INTO phone_numbers (user_id, number, provider)
       VALUES ($1,$2,'evcplus') RETURNING id`,
      [userId, `2526${String(suffix).slice(-7)}`]
    );
    phoneId = p.rows[0].id;

    const job = {
      provider: "evcplus",
      phoneNumberId: phoneId!,
      userId: userId!,
      receivedAt: new Date().toISOString(),
      structuredPayload: {
        event_id: "evt_test", event_type: "transaction.completed",
        created_at: "2026-06-13T11:34:22Z", api_version: "2026-01-01",
        data: {
          transaction_id: `TXN${suffix}`, channel: "EVC_PLUS", type: "SEND_MONEY",
          currency: "USD", amount: 1.0, fee: 0.0, user_phone: "252610838368",
          counterparty: { phone: "252610838369", name: "FARDOWSA MAXAMED MAXAMUUD", type: "INDIVIDUAL" },
          user_running_balance: 7.36, status: "SUCCESS",
        },
      },
    };

    console.log("Processing job...");
    await processTransactionJob(job);

    const tx = await pool.query(
      `SELECT type, direction, amount, balance_after,
              transacted_date, transacted_hour, transacted_day_of_week,
              counterparty_name_enc, counterparty_phone_enc,
              counterparty_phone_hash, provider_reference
       FROM transactions WHERE user_id = $1`,
      [userId]
    );
    console.log("Rows inserted:", tx.rowCount);
    const row = tx.rows[0];
    console.log("  type/dir/amount :", row.type, row.direction, row.amount);
    console.log("  date/hour/dow   :", row.transacted_date, row.transacted_hour, row.transacted_day_of_week);
    console.log("  reference       :", row.provider_reference);
    console.log("  name_enc (cipher):", row.counterparty_name_enc.slice(0, 24) + "...");

    const dek = await getUserDek(userId!);
    console.log("  decrypted name  :", decryptField(row.counterparty_name_enc, dek));
    console.log("  decrypted phone :", decryptField(row.counterparty_phone_enc, dek));
    console.log("  phone hash set  :", !!row.counterparty_phone_hash);

    console.log("Re-processing identical job (idempotency)...");
    await processTransactionJob(job);
    const cnt = await pool.query(
      `SELECT count(*)::int AS n FROM transactions WHERE user_id = $1`, [userId]
    );
    console.log("  total rows now  :", cnt.rows[0].n, cnt.rows[0].n === 1 ? "✓ no duplicate" : "✗");
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM user_encryption_keys WHERE user_id=$1`, [userId]);
      if (phoneId) await pool.query(`DELETE FROM phone_numbers WHERE id=$1`, [phoneId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("3.2 test FAILED:", e); process.exit(1); });