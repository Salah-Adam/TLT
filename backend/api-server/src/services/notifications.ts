import { pool } from "../db";
import { AppError } from "../lib/errors";
import { Lang } from "../lib/messages";
import { encodeCursor, decodeCursor } from "../utils/cursor";

function shape(row: any, lang: Lang) {
  return {
    id: row.id,
    type: row.type,
    title: lang === "so" ? row.title_so : row.title_en,
    body:  lang === "so" ? row.body_so  : row.body_en,
    data: row.data ?? null,
    is_read: row.is_read,
    sent_at: row.sent_at,
    read_at: row.read_at,
  };
}

const SELECT_NOTIF = `
  SELECT id, type, title_en, title_so, body_en, body_so, data, is_read, sent_at, read_at
  FROM notifications
`;

// ── List ─────────────────────────────────────────────────────────
export async function listNotifications(f: {
  userId: string; lang: Lang; unreadOnly?: boolean; type?: string; cursor?: string; limit?: number;
}) {
  const limit = Math.min(Math.max(f.limit ?? 30, 10), 100);
  const where: string[] = ["user_id = $1", "is_deleted = FALSE"];   // ⬅
  const params: any[] = [f.userId];

  if (f.unreadOnly) where.push("is_read = FALSE");
  if (f.type) { params.push(f.type); where.push(`type = $${params.length}`); }

  if (f.cursor) {
    const c = decodeCursor(f.cursor);
    if (c) {
      params.push(c.transactedAt); const a = params.length;  // carries sent_at here
      params.push(c.id);           const b = params.length;
      where.push(`(sent_at, id) < ($${a}::timestamptz, $${b}::uuid)`);
    }
  }

  params.push(limit + 1);
  const sql = `${SELECT_NOTIF} WHERE ${where.join(" AND ")} ORDER BY sent_at DESC, id DESC LIMIT $${params.length}`;
  const res = await pool.query(sql, params);

  let rows = res.rows;
  const hasMore = rows.length > limit;
  if (hasMore) rows = rows.slice(0, limit);

  const notifications = rows.map((r) => shape(r, f.lang));
  const last = rows[rows.length - 1];
  const cursor = hasMore && last ? encodeCursor(new Date(last.sent_at).toISOString(), last.id) : null;

  return { notifications, cursor, has_more: hasMore, unread_count: await unreadCount(f.userId) };
}

// ── Badge count ──────────────────────────────────────────────────
export async function unreadCount(userId: string): Promise<number> {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND is_read=FALSE AND is_deleted=FALSE`,  // ⬅
    [userId]
  );
  return r.rows[0].n;
}

// ── Get one (used to return the row after marking read) ──────────
async function getOne(userId: string, id: string, lang: Lang) {
  const r = (await pool.query(
    `${SELECT_NOTIF} WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE`,  // ⬅
    [id, userId]
  )).rows[0];
  if (!r) throw new AppError("NOTIFICATION_NOT_FOUND", 404);
  return shape(r, lang);
}

// ── Mark one read (idempotent; respects chk_read_at) ─────────────
export async function markRead(userId: string, id: string, lang: Lang) {
  const owned = await pool.query(
    `SELECT is_read FROM notifications WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE`,  // ⬅
    [id, userId]
  );
  if (!owned.rowCount) throw new AppError("NOTIFICATION_NOT_FOUND", 404);
  if (!owned.rows[0].is_read) {
    await pool.query(`UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE id=$1`, [id]);
  }
  return getOne(userId, id, lang);
}

// ── Mark all read ────────────────────────────────────────────────
export async function markAllRead(userId: string): Promise<number> {
  const r = await pool.query(
    `UPDATE notifications SET is_read=TRUE, read_at=NOW()
     WHERE user_id=$1 AND is_read=FALSE AND is_deleted=FALSE`,  // ⬅
    [userId]
  );
  return r.rowCount ?? 0;
}

// ── Delete one (soft) ────────────────────────────────────────────
export async function deleteNotification(userId: string, id: string) {
  const r = await pool.query(
    `UPDATE notifications SET is_deleted=TRUE, deleted_at=NOW()
     WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE RETURNING id`,  // ⬅ soft delete, idempotent
    [id, userId]
  );
  if (!r.rowCount) throw new AppError("NOTIFICATION_NOT_FOUND", 404);
}