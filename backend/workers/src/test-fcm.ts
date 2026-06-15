import { pool } from "./db";
import { processNotificationJob } from "./notification-processor";
import { sendPush } from "./services/fcm";

async function main() {
  console.log("Part A — sendPush dry-run (fake token):");
  const id = await sendPush({
    token: "fake-device-token-123",
    title: "Money sent",
    body: "You sent $0.50. Balance: $2.79.",
    data: { transactionId: "tx-1", amount: 0.5, balanceAfter: 2.79 },
  });
  console.log("  returned:", id);

  console.log("\nPart B — processNotificationJob (no real token yet):");
  const suffix = Date.now();
  let userId: string | undefined;
  try {
    const u = await pool.query(
      `INSERT INTO users (username,email,password_hash,language)
       VALUES ($1,$2,$3,'so') RETURNING id`,
      [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]
    );
    userId = u.rows[0].id;

    await processNotificationJob({
      userId: userId!, transactionId: "tx-abc",
      direction: "out", amount: 0.5, currency: "USD", balanceAfter: 2.79,
    });

    const row = await pool.query(
      `SELECT type, body_so, fcm_message_id FROM notifications WHERE user_id=$1`, [userId]
    );
    console.log("  stored:", row.rows[0]);
    console.log("  fcm_message_id null (no token yet):",
      row.rows[0].fcm_message_id === null ? "✓" : "✗");
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("4.3 test FAILED:", e); process.exit(1); });