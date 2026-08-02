import { pool } from "./db";
import { renderTransactionNotification, pickLanguage } from "./services/messages";
import { sendPush } from "./services/fcm";
import type { TransactionNotification } from "./services/notifications";


async function getDeviceToken(userId: string): Promise<string | null> {
  const r = await pool.query(
    `SELECT token FROM device_tokens
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY last_used_at DESC LIMIT 1`,
    [userId]
  );
  return r.rows[0]?.token ?? null;
}

// export async function processNotificationJob(job: TransactionNotification): Promise<void> {
//   const rendered = renderTransactionNotification(job);

//   // 1. Store the notification (both languages).
//   const stored = await pool.query(
//     `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
//      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
//     [job.userId, rendered.type, rendered.titleEn, rendered.titleSo,
//      rendered.bodyEn, rendered.bodySo, JSON.stringify(rendered.data)]
//   );
//   const notificationId = stored.rows[0].id;
//   console.log(`  stored notification ${notificationId} (${rendered.type})`);

//   // 2. Choose the push language from the user's setting.
//   const u = await pool.query(`SELECT language FROM users WHERE id = $1`, [job.userId]);
//   const language = u.rows[0]?.language ?? "so";
//   const { title, body } = pickLanguage(rendered, language);

//   // 3. Look up the device token (none until Phase 6) and send.
//   const token = await getDeviceToken(job.userId);
//   // const messageId = await sendPush({ token, title, body, data: rendered.data });
//   const messageId = await sendPush({ token, title, body, data: { ...rendered.data, notificationId } });

//   // 4. Record the FCM id if a push actually went out.
//   if (messageId) {
//     await pool.query(`UPDATE notifications SET fcm_message_id = $1 WHERE id = $2`,
//       [messageId, notificationId]);
//     console.log(`  fcm_message_id recorded`);
//   }
// }

export async function processNotificationJob(job: TransactionNotification): Promise<void> {
  const rendered = renderTransactionNotification(job);
  // The transaction itself is the record — no notifications row is stored.
  const u = await pool.query(`SELECT language FROM users WHERE id = $1`, [job.userId]);
  const language = u.rows[0]?.language ?? "so";
  const { title, body } = pickLanguage(rendered, language);
  const token = await getDeviceToken(job.userId);
  await sendPush({ token, title, body, data: rendered.data }); // data carries transactionId
}


// Push an ALREADY-STORED notification (spending alerts, reclaim, summaries) by id.
export async function pushStoredNotification(notificationId: string, userId: string): Promise<void> {
  const n = (await pool.query(
    `SELECT type, title_en, title_so, body_en, body_so, data FROM notifications WHERE id=$1 AND user_id=$2`,
    [notificationId, userId]
  )).rows[0];
  if (!n) { console.log(`  stored notification ${notificationId} not found — skip`); return; }

  const u = await pool.query(`SELECT language FROM users WHERE id=$1`, [userId]);
  const lang = u.rows[0]?.language === "en" ? "en" : "so";
  const title = lang === "so" ? n.title_so : n.title_en;
  const body  = lang === "so" ? n.body_so  : n.body_en;

  let d: any = n.data;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = {}; } }
  const data = { ...(d ?? {}), notificationId };

  const token = await getDeviceToken(userId);
  const messageId = await sendPush({ token, title, body, data });
  if (messageId) {
    await pool.query(`UPDATE notifications SET fcm_message_id=$1 WHERE id=$2`, [messageId, notificationId]);
    console.log(`  fcm sent for ${n.type} (${notificationId})`);
  } else {
    console.log(`  no push for ${n.type} (${notificationId}) — no device token`);
  }
}

