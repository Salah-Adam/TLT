import { pool } from "./db";
import { processTransactionJob } from "./processor";
import { createUserDek, encryptField, hashValue } from "./services/encryption";

const TRACKED = "252610838369";
const UNTRACKED = "252615550000";

function makeJob(phoneId: string, userId: string, type: string, amount: number, txnId: string, counterparty: string) {
  return {
    provider: "evcplus", phoneNumberId: phoneId, userId,
    receivedAt: new Date().toISOString(),
    structuredPayload: {
      event_id: `evt_${txnId}`, event_type: "transaction.completed",
      created_at: "2026-06-13T11:34:22Z", api_version: "2026-01-01",
      data: {
        transaction_id: txnId, channel: "EVC_PLUS", type,
        currency: "USD", amount, fee: 0.0, user_phone: "252610838368",
        counterparty: { phone: counterparty, name: "SOMEONE", type: "INDIVIDUAL" },
        user_running_balance: 50.0, status: "SUCCESS",
      },
    },
  };
}

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;
  let phoneId: string | undefined;
  let contactId: string | undefined;

  try {
    await pool.query(`INSERT INTO providers (code, display_name, company_name)
      VALUES ('evcplus','EVC Plus','Hormuud') ON CONFLICT (code) DO NOTHING`);
    const u = await pool.query(`INSERT INTO users (username,email,password_hash)
      VALUES ($1,$2,$3) RETURNING id`, [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]);
    userId = u.rows[0].id;
    const dek = await createUserDek(userId!);
    const p = await pool.query(`INSERT INTO phone_numbers (user_id,number,provider)
      VALUES ($1,$2,'evcplus') RETURNING id`, [userId, `2526${String(suffix).slice(-7)}`]);
    phoneId = p.rows[0].id;

    const c = await pool.query(`INSERT INTO tracked_contacts (user_id, phone_number_id, label)
      VALUES ($1,$2,'Wife') RETURNING id`, [userId, phoneId]);
    contactId = c.rows[0].id;
    await pool.query(`INSERT INTO tracked_contact_numbers
      (contact_id, user_id, tracked_number_enc, tracked_number_hash) VALUES ($1,$2,$3,$4)`,
      [contactId, userId, encryptField(TRACKED, dek), hashValue(TRACKED)]);

    console.log("sent 10 to tracked, received 4 from tracked, sent 7 to untracked...");
    await processTransactionJob(makeJob(phoneId!, userId!, "SEND_MONEY", 10, `T1${suffix}`, TRACKED));
    await processTransactionJob(makeJob(phoneId!, userId!, "RECEIVE_MONEY", 4, `T2${suffix}`, TRACKED));
    await processTransactionJob(makeJob(phoneId!, userId!, "SEND_MONEY", 7, `T3${suffix}`, UNTRACKED));

    const num = await pool.query(`SELECT total_sent,total_received,transaction_count
      FROM tracked_contact_numbers WHERE user_id=$1`, [userId]);
    console.log("TRACKED NUMBER :", num.rows[0]);
    const con = await pool.query(`SELECT label,total_sent,total_received,transaction_count
      FROM tracked_contacts WHERE id=$1`, [contactId]);
    console.log("TRACKED CONTACT:", con.rows[0]);
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM tracked_contact_numbers WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM tracked_contacts WHERE user_id=$1`, [userId]);
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

main().catch((e) => { console.error("3.4 test FAILED:", e); process.exit(1); });