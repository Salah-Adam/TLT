import { pool } from "./db";
import { renderTransactionNotification, pickLanguage } from "./services/messages";
import { sendPush } from "./services/fcm";
import type { TransactionNotification } from "./services/notifications";

// Phase 6 wires this to the device tokens the mobile app registers.
// async function getDeviceToken(_userId: string): Promise<string | null> {
//   return null;
// }
async function getDeviceToken(userId: string): Promise<string | null> {
  const r = await pool.query(
    `SELECT token FROM device_tokens
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY last_used_at DESC LIMIT 1`,
    [userId]
  );
  return r.rows[0]?.token ?? null;
}

export async function processNotificationJob(job: TransactionNotification): Promise<void> {
  const rendered = renderTransactionNotification(job);

  // 1. Store the notification (both languages).
  const stored = await pool.query(
    `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [job.userId, rendered.type, rendered.titleEn, rendered.titleSo,
     rendered.bodyEn, rendered.bodySo, JSON.stringify(rendered.data)]
  );
  const notificationId = stored.rows[0].id;
  console.log(`  stored notification ${notificationId} (${rendered.type})`);

  // 2. Choose the push language from the user's setting.
  const u = await pool.query(`SELECT language FROM users WHERE id = $1`, [job.userId]);
  const language = u.rows[0]?.language ?? "so";
  const { title, body } = pickLanguage(rendered, language);

  // 3. Look up the device token (none until Phase 6) and send.
  const token = await getDeviceToken(job.userId);
  // const messageId = await sendPush({ token, title, body, data: rendered.data });
  const messageId = await sendPush({ token, title, body, data: { ...rendered.data, notificationId } });

  // 4. Record the FCM id if a push actually went out.
  if (messageId) {
    await pool.query(`UPDATE notifications SET fcm_message_id = $1 WHERE id = $2`,
      [messageId, notificationId]);
    console.log(`  fcm_message_id recorded`);
  }
}



// import { pool } from "./db";
// import { renderTransactionNotification } from "./services/messages";
// import type { TransactionNotification } from "./services/notifications";

// /**
//  * Render a queued notification into both languages and store it.
//  * (4.3 will add: look up the device token, send via FCM, and write
//  * back the fcm_message_id.)
//  */
// export async function processNotificationJob(job: TransactionNotification): Promise<void> {
//   const rendered = renderTransactionNotification(job);

//   const result = await pool.query(
//     `INSERT INTO notifications (
//        user_id, type, title_en, title_so, body_en, body_so, data
//      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
//      RETURNING id`,
//     [
//       job.userId, rendered.type,
//       rendered.titleEn, rendered.titleSo,
//       rendered.bodyEn, rendered.bodySo,
//       JSON.stringify(rendered.data),
//     ]
//   );

//   console.log(`  stored notification ${result.rows[0].id} for user ${job.userId} (${rendered.type})`);
// }