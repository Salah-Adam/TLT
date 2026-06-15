import { Queue } from "bullmq";
import { pool } from "./db";
import { processTransactionJob } from "./processor";
import { createUserDek } from "./services/encryption";
import { closeNotificationQueue } from "./services/notifications";
import { config } from "./config";

function makeJob(phoneId: string, userId: string, txnId: string) {
  return {
    provider: "evcplus", phoneNumberId: phoneId, userId,
    receivedAt: new Date().toISOString(),
    structuredPayload: {
      event_id: `evt_${txnId}`, event_type: "transaction.completed",
      created_at: "2026-06-13T11:34:22Z", api_version: "2026-01-01",
      data: {
        transaction_id: txnId, channel: "EVC_PLUS", type: "SEND_MONEY",
        currency: "USD", amount: 0.5, fee: 0.0, user_phone: "252610838368",
        counterparty: { phone: "252610838369", name: "SOMEONE", type: "INDIVIDUAL" },
        user_running_balance: 2.79, status: "SUCCESS",
      },
    },
  };
}

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;
  let phoneId: string | undefined;
  const inspect = new Queue("notifications", {
    connection: { host: config.redis.host, port: config.redis.port },
  });

  try {
    await pool.query(`INSERT INTO providers (code,display_name,company_name)
      VALUES ('evcplus','EVC Plus','Hormuud') ON CONFLICT (code) DO NOTHING`);
    const u = await pool.query(`INSERT INTO users (username,email,password_hash)
      VALUES ($1,$2,$3) RETURNING id`, [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]);
    userId = u.rows[0].id;
    await createUserDek(userId!);
    const p = await pool.query(`INSERT INTO phone_numbers (user_id,number,provider)
      VALUES ($1,$2,'evcplus') RETURNING id`, [userId, `2526${String(suffix).slice(-7)}`]);
    phoneId = p.rows[0].id;

    console.log("Processing a 'sent 0.50' transaction...");
    await processTransactionJob(makeJob(phoneId!, userId!, `TXN${suffix}`));

    const waiting = await inspect.getWaiting(0, 100);
    const mine = waiting.filter((j) => j.data?.userId === userId);
    console.log("Notification jobs queued for this user:", mine.length);
    if (mine.length) {
      console.log("  job name:", mine[0].name);
      console.log("  job data:", mine[0].data);
    }
    for (const j of mine) await j.remove(); // clean the test job out of the queue
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM daily_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM monthly_summaries WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM user_encryption_keys WHERE user_id=$1`, [userId]);
      if (phoneId) await pool.query(`DELETE FROM phone_numbers WHERE id=$1`, [phoneId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await inspect.close();
    await closeNotificationQueue();
    await pool.end();
  }
}

main().catch((e) => { console.error("3.5 test FAILED:", e); process.exit(1); });