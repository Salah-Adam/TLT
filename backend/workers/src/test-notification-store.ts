import { pool } from "./db";
import { processNotificationJob } from "./notification-processor";

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;

  try {
    const u = await pool.query(
      `INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id`,
      [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]
    );
    userId = u.rows[0].id;

    console.log("Processing a notification job (out 0.50)...");
    await processNotificationJob({
      userId: userId!, transactionId: "tx-abc",
      direction: "out", amount: 0.5, currency: "USD", balanceAfter: 2.79,
    });

    const rows = await pool.query(
      `SELECT type, title_en, title_so, body_en, body_so, data, is_read, fcm_message_id
       FROM notifications WHERE user_id = $1`, [userId]
    );
    console.log("Notifications stored:", rows.rowCount);
    console.log(rows.rows[0]);
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("4.2 test FAILED:", e); process.exit(1); });