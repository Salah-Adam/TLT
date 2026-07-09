// Notifications repository. Read = local cache (offline-safe). Mark-read = optimistic + queue
// (read_pending flag, flushed on sync). Delete = online-only.

// import { getDb } from "../db";
import { getDb, withDbLock } from "../db";

import { api } from "../api/client";

export type Notif = {
  id: string; type: string; title: string; body: string;
  data: any | null; is_read: boolean; sent_at: string; read_at: string | null;
};

const WINDOW = 40;
const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

function rowToNotif(r: any): Notif {
  return {
    id: r.id, type: r.type, title: r.title, body: r.body,
    data: r.data ? safeParse(r.data) : null,
    is_read: !!r.is_read, sent_at: r.sent_at, read_at: r.read_at ?? null,
  };
}

type ApiNotif = { id: string; type: string; title: string; body: string; data: any; is_read: boolean; sent_at: string; read_at: string | null };

export async function refreshNotifications(): Promise<void> {
  const { data } = await api.getWithMeta<ApiNotif[]>(`/api/v1/notifications?limit=${WINDOW}`);
  const items = data ?? [];
  const db = await getDb();

  // Preserve local read state — optimistic/queued reads may be ahead of the server snapshot.
  const localRows = await db.getAllAsync<{ id: string; is_read: number; read_pending: number }>(
    "SELECT id, is_read, read_pending FROM notifications"
  );
  const localById = new Map(localRows.map((r) => [r.id, r]));

  // await db.withTransactionAsync(async () => {
  //   await db.execAsync("DELETE FROM notifications");
  //   for (const n of items) {
  //     const local = localById.get(n.id);
  //     const isRead = (n.is_read || local?.is_read === 1) ? 1 : 0;   // read is sticky
  //     const readPending = local?.read_pending === 1 ? 1 : 0;         // keep queued reads
  //     await db.runAsync(
  //       `INSERT OR REPLACE INTO notifications (id, type, title, body, data, is_read, read_pending, sent_at, read_at)
  //        VALUES (?,?,?,?,?,?,?,?,?)`,
  //       [n.id, n.type, n.title, n.body, n.data ? JSON.stringify(n.data) : null, isRead, readPending, n.sent_at, n.read_at ?? null]
  //     );
  //   }
  // });

  await withDbLock(() => db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM notifications");
    for (const n of items) {
      const local = localById.get(n.id);
      const isRead = (n.is_read || local?.is_read === 1) ? 1 : 0;
      const readPending = local?.read_pending === 1 ? 1 : 0;
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications (id, type, title, body, data, is_read, read_pending, sent_at, read_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [n.id, n.type, n.title, n.body, n.data ? JSON.stringify(n.data) : null, isRead, readPending, n.sent_at, n.read_at ?? null]
      );
    }
  }));
}

// export async function refreshNotifications(): Promise<void> {
//   const { data } = await api.getWithMeta<ApiNotif[]>(`/api/v1/notifications?limit=${WINDOW}`);
//   const items = data ?? [];
//   const db = await getDb();
//   await db.withTransactionAsync(async () => {
//     await db.execAsync("DELETE FROM notifications");
//     for (const n of items) {
//       await db.runAsync(
//         `INSERT OR REPLACE INTO notifications (id, type, title, body, data, is_read, read_pending, sent_at, read_at)
//          VALUES (?,?,?,?,?,?,0,?,?)`,
//         [n.id, n.type, n.title, n.body, n.data ? JSON.stringify(n.data) : null, n.is_read ? 1 : 0, n.sent_at, n.read_at ?? null]
//       );
//     }
//   });
// }

export async function readNotifications(opts: { unreadOnly?: boolean; limit?: number } = {}): Promise<Notif[]> {
  const db = await getDb();
  const where = opts.unreadOnly ? "WHERE is_read = 0" : "";
  const rows = await db.getAllAsync<any>(`SELECT * FROM notifications ${where} ORDER BY sent_at DESC, id DESC LIMIT ?`, [opts.limit ?? 200]);
  return rows.map(rowToNotif);
}

export async function getUnread(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0");
  return r?.n ?? 0;
}

// Optimistic mark-read: update cache now; call the API if online, else queue (read_pending).
export async function markRead(id: string, online: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, ?), read_pending = ? WHERE id = ?",
    [new Date().toISOString(), online ? 0 : 1, id]
  );
  if (online) {
    try { await api.patch(`/api/v1/notifications/${id}/read`); }
    catch { await db.runAsync("UPDATE notifications SET read_pending = 1 WHERE id = ?", [id]); }
  }
}

export async function markAllRead(online: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, ?), read_pending = ? WHERE is_read = 0",
    [new Date().toISOString(), online ? 0 : 1]
  );
  if (online) {
    try { await api.post(`/api/v1/notifications/read-all`); }
    catch { await db.runAsync("UPDATE notifications SET read_pending = 1 WHERE is_read = 1"); }
  }
}

// Push any queued reads to the server (called by syncAll before refresh).
export async function flushPendingReads(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM notifications WHERE read_pending = 1");
  for (const r of rows) {
    try { await api.patch(`/api/v1/notifications/${r.id}/read`); await db.runAsync("UPDATE notifications SET read_pending = 0 WHERE id = ?", [r.id]); }
    catch { /* leave pending for next sync */ }
  }
}

// Online-only per your decision — the caller guards on connectivity.
export async function deleteNotification(id: string): Promise<void> {
  await api.del(`/api/v1/notifications/${id}`);
  const db = await getDb();
  await db.runAsync("DELETE FROM notifications WHERE id = ?", [id]);
}

// ── Type-families (folders) ──────────────────────────────────────
export type Family = "transactions" | "alerts" | "summaries" | "reports" | "account";

export function familyOf(type: string): Family {
  if (type === "transaction_received" || type === "transaction_sent") return "transactions";
  if (type === "spending_alert") return "alerts";
  if (type.endsWith("_summary")) return "summaries";
  if (type === "report_ready") return "reports";
  return "account"; // account, trial_ending, anything else
}

export type Folder = { key: Family; unread: number; total: number; latestTitle: string; latestBody: string; latestAt: string };

// Level-1: one row per family, newest-active folder first.
export async function readFolders(): Promise<Folder[]> {
  const all = await readNotifications({ limit: 500 }); // newest-first
  const map = new Map<Family, Notif[]>();
  for (const n of all) { const f = familyOf(n.type); if (!map.has(f)) map.set(f, []); map.get(f)!.push(n); }
  const folders: Folder[] = [];
  for (const [key, list] of map.entries()) {
    const latest = list[0];
    folders.push({ key, unread: list.filter((n) => !n.is_read).length, total: list.length, latestTitle: latest.title, latestBody: latest.body, latestAt: latest.sent_at });
  }
  folders.sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));
  return folders;
}

// Level-2: all messages of one family, newest-first.
export async function readByFamily(fam: Family): Promise<Notif[]> {
  const all = await readNotifications({ limit: 500 });
  return all.filter((n) => familyOf(n.type) === fam);
}

// Opening a folder marks all its messages read (optimistic + queue).
export async function markFamilyRead(fam: Family, online: boolean): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; type: string }>("SELECT id, type FROM notifications WHERE is_read = 0");
  const ids = rows.filter((r) => familyOf(r.type) === fam).map((r) => r.id);
  if (!ids.length) return;
  const ph = ids.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, ?), read_pending = ? WHERE id IN (${ph})`,
    [new Date().toISOString(), online ? 0 : 1, ...ids]
  );
  if (online) {
    for (const id of ids) {
      try { await api.patch(`/api/v1/notifications/${id}/read`); }
      catch { await db.runAsync("UPDATE notifications SET read_pending = 1 WHERE id = ?", [id]); }
    }
  }
}