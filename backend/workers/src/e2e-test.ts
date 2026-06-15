import { pool } from "./db";
import { createUserDek, getUserDek, decryptField, encryptField, hashValue } from "./services/encryption";

const COUNTERPARTY = "252610838369";
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "http://localhost/webhooks/evcplus";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label: string, sql: string, params: unknown[], timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await pool.query(sql, params);
    if (res.rowCount && res.rowCount > 0) return res.rows[0];
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  const suffix = Date.now();
  const token = `e2e_${suffix}`;
  let userId: string | undefined;
  let phoneId: string | undefined;
  let contactId: string | undefined;

  try {
    // ---- Seed a real user, phone (with token), and a tracked contact ----
    await pool.query(`INSERT INTO providers (code,display_name,company_name)
      VALUES ('evcplus','EVC Plus','Hormuud') ON CONFLICT (code) DO NOTHING`);
    const u = await pool.query(`INSERT INTO users (username,email,password_hash,language)
      VALUES ($1,$2,$3,'so') RETURNING id`, [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]);
    userId = u.rows[0].id;
    const dek = await createUserDek(userId!);
    const p = await pool.query(`INSERT INTO phone_numbers (user_id,number,provider,webhook_token,is_active)
      VALUES ($1,$2,'evcplus',$3,TRUE) RETURNING id`, [userId, `2526${String(suffix).slice(-7)}`, token]);
    phoneId = p.rows[0].id;
    const c = await pool.query(`INSERT INTO tracked_contacts (user_id, phone_number_id, label)
      VALUES ($1,$2,'Supplier') RETURNING id`, [userId, phoneId]);
    contactId = c.rows[0].id;
    await pool.query(`INSERT INTO tracked_contact_numbers (contact_id,user_id,tracked_number_enc,tracked_number_hash)
      VALUES ($1,$2,$3,$4)`, [contactId, userId, encryptField(COUNTERPARTY, dek), hashValue(COUNTERPARTY)]);
    console.log("Seeded user, phone (token), and a 'Supplier' tracked contact.");

    // ---- Fire a real webhook at the server ----
    const payload = {
      event_id: `evt_${suffix}`, event_type: "transaction.completed",
      created_at: "2026-06-13T11:34:22Z", api_version: "2026-01-01",
      data: {
        transaction_id: `TXN${suffix}`, channel: "EVC_PLUS", type: "SEND_MONEY",
        currency: "USD", amount: 3.5, fee: 0.0, user_phone: "252610838368",
        counterparty: { phone: COUNTERPARTY, name: "GEENYO SUPPLIES", type: "BUSINESS" },
        user_running_balance: 12.5, status: "SUCCESS",
      },
    };
    console.log(`POST ${WEBHOOK_URL}`);
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": token },
      body: JSON.stringify(payload),
    });
    console.log(`  webhook-server responded: ${resp.status} ${JSON.stringify(await resp.json())}`);

    // ---- Wait for the async pipeline and verify each stage ----
    console.log("Waiting for the transaction worker...");
    const tx = await waitFor("transaction",
      `SELECT type, direction, amount, counterparty_name_enc FROM transactions WHERE user_id=$1`, [userId]);
    const name = decryptField(tx.counterparty_name_enc, await getUserDek(userId!));
    console.log(`  transaction: ${tx.type}/${tx.direction} ${tx.amount}, party="${name}" (decrypted)`);

    const daily = await pool.query(`SELECT total_out, transaction_count FROM daily_summaries WHERE user_id=$1`, [userId]);
    console.log(`  daily summary: out=${daily.rows[0]?.total_out}, count=${daily.rows[0]?.transaction_count}`);

    const tracked = await pool.query(`SELECT label, total_sent FROM tracked_contacts WHERE id=$1`, [contactId]);
    console.log(`  tracked contact: ${tracked.rows[0]?.label} sent=${tracked.rows[0]?.total_sent}`);

    console.log("Waiting for the notification worker...");
    const notif = await waitFor("notification",
      `SELECT type, body_so FROM notifications WHERE user_id=$1`, [userId]);
    console.log(`  notification: ${notif.type} — "${notif.body_so}"`);

    console.log("\n✓ END-TO-END PASSED: webhook → transaction worker → notification worker");
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM tracked_contact_numbers WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM tracked_contacts WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM daily_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM monthly_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM user_encryption_keys WHERE user_id=$1`, [userId]);
      if (phoneId) await pool.query(`DELETE FROM phone_numbers WHERE id=$1`, [phoneId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("E2E FAILED:", e); process.exit(1); });