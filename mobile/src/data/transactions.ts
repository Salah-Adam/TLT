// The Transactions repository — same shape as categories.ts / home.ts.
// Offline: a cached window in the encrypted `transactions` table; readers work offline,
// and every online page we fetch is upserted, so the cache grows as you browse.
// Online: full server-backed list/search/pagination + category/note/delete writes.

// import { getDb } from "../db";
import { getDb, withDbLock } from "../db";
import { api } from "../api/client";

export type Tx = {
  id: string;
  phone_number_id: string | null;
  provider: string | null;
  amount: number;
  currency: string;
  direction: "in" | "out";
  type: string | null;
  balance_after: number | null;
  service_charge: number | null;
  counterparty_name: string | null;
  counterparty_number: string | null;
  counterparty_available: boolean;
  category: { id: string; name: string } | null;
  note: string | null;
  provider_reference: string | null;
  is_auto_categorized: boolean;
  transacted_at: string;
  transacted_date: string;
};

// export type TxFilters = {
//   direction?: "in" | "out";
//   categoryId?: string;
//   dateFrom?: string; // YYYY-MM-DD
//   dateTo?: string;   // YYYY-MM-DD
// };

export type TxFilters = {
  phoneNumberIds?: string[];
  direction?: "in" | "out";
  categoryId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
};

export type TxPage = { items: Tx[]; cursor: string | null; hasMore: boolean };

const WINDOW = 50;

// ── row <-> Tx mapping ───────────────────────────────────────────
function rowToTx(r: any): Tx {
  return {
    id: r.id,
    phone_number_id: r.phone_number_id ?? null,
    provider: r.provider ?? null,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? "",
    direction: r.direction,
    type: r.type ?? null,
    balance_after: r.balance_after == null ? null : Number(r.balance_after),
    service_charge: r.service_charge == null ? null : Number(r.service_charge),
    counterparty_name: r.counterparty_name ?? null,
    counterparty_number: r.counterparty_number ?? null,
    counterparty_available: !!r.counterparty_available,
    category: r.category_id ? { id: r.category_id, name: r.category_name } : null,
    note: r.note ?? null,
    provider_reference: r.provider_reference ?? null,
    is_auto_categorized: !!r.is_auto_categorized,
    transacted_at: r.transacted_at,
    transacted_date: r.transacted_date,
  };
}

async function upsertOne(db: any, t: Tx): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions
      (id, phone_number_id, provider, amount, currency, direction, type,
       balance_after, service_charge, counterparty_name, counterparty_number,
       counterparty_available, category_id, category_name, note, provider_reference,
       is_auto_categorized, transacted_at, transacted_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      t.id, t.phone_number_id, t.provider, t.amount, t.currency, t.direction, t.type,
      t.balance_after, t.service_charge, t.counterparty_name, t.counterparty_number,
      t.counterparty_available ? 1 : 0, t.category?.id ?? null, t.category?.name ?? null,
      t.note, t.provider_reference, t.is_auto_categorized ? 1 : 0, t.transacted_at, t.transacted_date,
    ]
  );
}

// async function upsertMany(items: Tx[]): Promise<void> {
//   if (!items.length) return;
//   const db = await getDb();
//   await db.withTransactionAsync(async () => {
//     for (const t of items) await upsertOne(db, t);
//   });
// }

async function upsertMany(items: Tx[]): Promise<void> {
  if (!items.length) return;
  const db = await getDb();
  await withDbLock(() => db.withTransactionAsync(async () => {
    for (const t of items) await upsertOne(db, t);
  }));
}

// ── query-string builder ─────────────────────────────────────────
function qs(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// ── online: list/search one page (and grow the cache) ────────────
export async function fetchTransactionsPage(opts: {
  cursor?: string | null;
  filters?: TxFilters;
  q?: string;
}): Promise<TxPage> {
  const { cursor, filters = {}, q } = opts;
  const search = (q ?? "").trim();
  const base = search ? "/api/v1/transactions/search" : "/api/v1/transactions";
  const query = qs({
    q: search || undefined,
    phone_number_ids: filters.phoneNumberIds?.length ? filters.phoneNumberIds.join(",") : undefined,
    direction: filters.direction,
    category_id: search ? undefined : filters.categoryId, // /search has no category filter
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    cursor: cursor ?? undefined,
    limit: WINDOW,
  });
  // const { data, meta } = await api.getWithMeta<Tx[]>(`${base}${query}`);
  // const items = data ?? [];
  // await upsertMany(items); // cache grows as you scroll/search online
  // return { items, cursor: meta?.cursor ?? null, hasMore: !!meta?.has_more };

  const { data, meta } = await api.getWithMeta<Tx[]>(`${base}${query}`);
  const items = data ?? [];
  upsertMany(items).catch(() => {}); // cache in the background — don't block the list on a locked write
  return { items, cursor: meta?.cursor ?? null, hasMore: !!meta?.has_more };


}

// ── sync: refresh the cached window (called by syncAll) ──────────
// export async function refreshTransactions(): Promise<void> {
//   const { data } = await api.getWithMeta<Tx[]>(`/api/v1/transactions?limit=${WINDOW}`);
//   const items = data ?? [];
//   const db = await getDb();
//   await db.withTransactionAsync(async () => {
//     await db.execAsync("DELETE FROM transactions");
//     for (const t of items) await upsertOne(db, t);
//   });
// }

export async function refreshTransactions(): Promise<void> {
  const { data } = await api.getWithMeta<Tx[]>(`/api/v1/transactions?limit=${WINDOW}`);
  const items = data ?? [];
  const db = await getDb();
  await withDbLock(() => db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM transactions");
    for (const t of items) await upsertOne(db, t);
  }));
}

// ── offline-safe reads (local table, with optional filter/search) ─
export async function queryCache(opts: { filters?: TxFilters; q?: string; limit?: number } = {}): Promise<Tx[]> {
  const { filters = {}, q, limit = 200 } = opts;
  const where: string[] = [];
  const args: any[] = [];
  if (filters.phoneNumberIds?.length) {
    where.push(`phone_number_id IN (${filters.phoneNumberIds.map(() => "?").join(",")})`);
    args.push(...filters.phoneNumberIds);}
  if (filters.direction) { where.push("direction = ?"); args.push(filters.direction); }
  if (filters.categoryId) { where.push("category_id = ?"); args.push(filters.categoryId); }
  if (filters.dateFrom) { where.push("transacted_date >= ?"); args.push(filters.dateFrom); }
  if (filters.dateTo) { where.push("transacted_date <= ?"); args.push(filters.dateTo); }
  const needle = (q ?? "").trim().toLowerCase();
  if (needle) {
    where.push("(LOWER(counterparty_name) LIKE ? OR counterparty_number LIKE ? OR LOWER(category_name) LIKE ?)");
    args.push(`%${needle}%`, `%${needle}%`, `%${needle}%`);
  }
  const db = await getDb();
  const sql = `SELECT * FROM transactions ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY transacted_at DESC, id DESC LIMIT ?`;
  args.push(limit);

  const rows = await db.getAllAsync<any>(sql, args);
  return rows.map(rowToTx);

  // const rows = await db.getAllAsync<any>(sql, args);
  // const seen = new Set<string>();
  // return rows.map(rowToTx).filter((tx) => (seen.has(tx.id) ? false : (seen.add(tx.id), true)));
  // const rows = await db.getAllAsync<any>(sql, args);
  // const ids = rows.map((r: any) => r.id);
  // const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  // if (dup.length) console.warn("DIAG[queryCache] SELECT returned dup:", dup, "| all:", ids);
  // return rows.map(rowToTx);
}

export async function readTransactions(limit = WINDOW): Promise<Tx[]> {
  return queryCache({ limit });
}

// ── detail (server-fresh when online, else cache) ────────────────
export async function getTransactionDetail(id: string, online: boolean): Promise<Tx | null> {
  if (online) {
    try {
      const tx = await api.get<Tx>(`/api/v1/transactions/${id}`);
      await upsertMany([tx]);
      return tx;
    } catch { /* fall through to cache */ }
  }
  const db = await getDb();
  const row = await db.getFirstAsync<any>("SELECT * FROM transactions WHERE id = ?", [id]);
  return row ? rowToTx(row) : null;
}

// ── writes (online only) — also patch the cached row ─────────────
export async function setTransactionCategory(id: string, categoryId: string | null): Promise<Tx> {
  const tx = await api.patch<Tx>(`/api/v1/transactions/${id}`, { category_id: categoryId });
  await upsertMany([tx]);
  return tx;
}

export async function setTransactionNote(id: string, note: string | null): Promise<Tx> {
  const tx = await api.patch<Tx>(`/api/v1/transactions/${id}`, { note });
  await upsertMany([tx]);
  return tx;
}

export async function deleteTransactionTx(id: string): Promise<void> {
  await api.del(`/api/v1/transactions/${id}`);
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}