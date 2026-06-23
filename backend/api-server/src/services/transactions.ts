import { pool } from "../db";
import { getUserDek, decryptField, hashValue } from "../encryption";
import { AppError } from "../lib/errors";
import { Lang } from "../lib/messages";
import { encodeCursor, decodeCursor } from "../utils/cursor";
import { evaluateSpendingAlerts } from "./spending-alerts";

type Dek = Buffer | null;

/** Load the user's DEK; on KMS/key failure, degrade (no decryption) instead of 500. */
async function loadDek(userId: string): Promise<Dek> {
  try {
    return await getUserDek(userId);
  } catch {
    return null;
  }
}

/** Per-row graceful decryption of the counterparty fields. */
function decryptCounterparty(row: any, dek: Dek): { name: string | null; number: string | null; available: boolean } {
  const hasCipher = !!(row.counterparty_name_enc || row.counterparty_phone_enc);
  if (!hasCipher) return { name: null, number: null, available: true };
  if (!dek) return { name: null, number: null, available: false };
  try {
    const name = row.counterparty_name_enc ? decryptField(row.counterparty_name_enc, dek) : null;
    const number = row.counterparty_phone_enc ? decryptField(row.counterparty_phone_enc, dek) : null;
    return { name, number, available: true };
  } catch {
    return { name: null, number: null, available: false };
  }
}

const num = (v: any): number | null => (v === null || v === undefined ? null : Number(v));

function formatTx(row: any, dek: Dek, lang: Lang) {
  const cp = decryptCounterparty(row, dek);
  return {
    id: row.id,
    phone_number_id: row.phone_number_id,
    provider: row.provider,
    amount: num(row.amount),
    currency: row.currency,
    direction: row.direction,
    type: row.type,
    balance_after: num(row.balance_after),
    service_charge: num(row.service_charge),
    counterparty_name: cp.name,
    counterparty_number: cp.number,
    counterparty_available: cp.available,
    category: row.category_id
      ? { id: row.category_id, name: lang === "so" ? row.category_name_so : row.category_name_en }
      : null,
    note: row.note ?? null,
    provider_reference: row.provider_reference ?? null,
    is_auto_categorized: row.is_auto_categorized,
    transacted_at: row.transacted_at,
    transacted_date: row.transacted_date,
  };
}

const SELECT_TX = `
  SELECT t.id, t.phone_number_id, t.provider, t.amount, t.currency, t.direction, t.type,
         t.balance_after, t.service_charge, t.counterparty_name_enc, t.counterparty_phone_enc,
         t.provider_reference, t.note, t.is_auto_categorized, t.transacted_at, t.transacted_date,
         t.category_id, c.name_en AS category_name_en, c.name_so AS category_name_so
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;

// ── List ─────────────────────────────────────────────────────────

export interface ListFilters {
  userId: string;
  lang: Lang;
  phoneNumberIds?: string[];
  direction?: "in" | "out";
  type?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export async function listTransactions(f: ListFilters) {
  const limit = Math.min(Math.max(f.limit ?? 50, 10), 100);
  const where: string[] = ["t.user_id = $1", "t.is_deleted = FALSE"];
  const params: any[] = [f.userId];

  if (f.phoneNumberIds?.length) { params.push(f.phoneNumberIds); where.push(`t.phone_number_id = ANY($${params.length}::uuid[])`); }
  if (f.direction) { params.push(f.direction); where.push(`t.direction = $${params.length}`); }
  if (f.type)      { params.push(f.type);      where.push(`t.type = $${params.length}`); }
  if (f.categoryId){ params.push(f.categoryId);where.push(`t.category_id = $${params.length}`); }
  if (f.dateFrom)  { params.push(f.dateFrom);  where.push(`t.transacted_date >= $${params.length}`); }
  if (f.dateTo)    { params.push(f.dateTo);    where.push(`t.transacted_date <= $${params.length}`); }

  if (f.cursor) {
    const c = decodeCursor(f.cursor);
    if (c) {
      params.push(c.transactedAt); const a = params.length;
      params.push(c.id);           const b = params.length;
      where.push(`(t.transacted_at, t.id) < ($${a}::timestamptz, $${b}::uuid)`);
    }
  }

  params.push(limit + 1);
  const sql = `${SELECT_TX} WHERE ${where.join(" AND ")} ORDER BY t.transacted_at DESC, t.id DESC LIMIT $${params.length}`;
  const res = await pool.query(sql, params);

  const dek = await loadDek(f.userId);
  let rows = res.rows;
  const hasMore = rows.length > limit;
  if (hasMore) rows = rows.slice(0, limit);

  const transactions = rows.map((r) => formatTx(r, dek, f.lang));
  const last = rows[rows.length - 1];
  const cursor = hasMore && last ? encodeCursor(new Date(last.transacted_at).toISOString(), last.id) : null;

  return { transactions, cursor, has_more: hasMore };
}

// ── Get one ──────────────────────────────────────────────────────

export async function getTransaction(userId: string, id: string, lang: Lang) {
  const res = await pool.query(`${SELECT_TX} WHERE t.id = $1 AND t.user_id = $2 AND t.is_deleted = FALSE`, [id, userId]);
  if (res.rowCount === 0) throw new AppError("TRANSACTION_NOT_FOUND", 404);
  const dek = await loadDek(userId);
  return formatTx(res.rows[0], dek, lang);
}

// ── Update (category / note) ─────────────────────────────────────

export async function updateTransaction(input: {
  userId: string;
  id: string;
  lang: Lang;
  categoryId?: string | null;
  note?: string | null;
}) {
  const { userId, id, lang } = input;

  const exists = await pool.query(`SELECT id FROM transactions WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE`, [id, userId]);
  if (exists.rowCount === 0) throw new AppError("TRANSACTION_NOT_FOUND", 404);

  if (input.categoryId !== undefined && input.categoryId !== null) {
    const cat = await pool.query(
      `SELECT 1 FROM categories WHERE id=$1 AND (user_id=$2 OR user_id IS NULL) AND deleted_at IS NULL`,
      [input.categoryId, userId]
    );
    if (cat.rowCount === 0) throw new AppError("CATEGORY_NOT_FOUND", 404);
  }

  if (input.categoryId !== undefined) {
    await pool.query(`UPDATE transactions SET category_id=$1, is_auto_categorized=FALSE updated_at=NOW()  WHERE id=$2`, [input.categoryId, id]);
  }
  if (input.note !== undefined) {
    await pool.query(`UPDATE transactions SET note=$1 updated_at=NOW()  WHERE id=$2`, [input.note, id]);
  }

  // A non-null category was set/changed → re-check spending alerts (best-effort).
  if (input.categoryId) {
    try { await evaluateSpendingAlerts(userId, id); }
    catch (e) { console.error("spending-alert evaluation failed:", e); }
  }

  return getTransaction(userId, id, lang);

  // return getTransaction(userId, id, lang);
}

// ── Soft delete (snapshot + flag; summaries untouched, per decision) ──

export async function deleteTransaction(userId: string, id: string) {
  const exists = await pool.query(`SELECT id FROM transactions WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE`, [id, userId]);
  if (exists.rowCount === 0) throw new AppError("TRANSACTION_NOT_FOUND", 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const snap = await client.query(
      `INSERT INTO deleted_transactions (id, original_data, phone_number_id, user_id)
       SELECT id, to_jsonb(t), phone_number_id, user_id FROM transactions t WHERE id=$1
       ON CONFLICT (id) DO UPDATE SET
         original_data       = EXCLUDED.original_data,
         deleted_by_user_at  = NOW(),
         permanent_delete_at = NOW() + INTERVAL '30 days',
         is_recovered        = FALSE,
         recovered_at        = NULL
       RETURNING permanent_delete_at`,
      [id]
    );
    await client.query(`UPDATE transactions SET is_deleted=TRUE, deleted_at=NOW() updated_at=NOW()  WHERE id=$1`, [id]);
    await client.query("COMMIT");
    return { recoverableUntil: snap.rows[0].permanent_delete_at };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ── List deleted (recoverable) ───────────────────────────────────

export async function listDeletedTransactions(userId: string, _lang: Lang) {
  const res = await pool.query(
    `SELECT id, original_data, deleted_by_user_at, permanent_delete_at
     FROM deleted_transactions
     WHERE user_id=$1 AND is_recovered=FALSE AND permanent_delete_at > NOW()
     ORDER BY deleted_by_user_at DESC`,
    [userId]
  );
  const dek = await loadDek(userId);
  return res.rows.map((r) => {
    const d = r.original_data;
    const cp = decryptCounterparty(d, dek);
    return {
      id: r.id,
      amount: num(d.amount),
      currency: d.currency,
      direction: d.direction,
      type: d.type,
      counterparty_name: cp.name,
      counterparty_number: cp.number,
      counterparty_available: cp.available,
      transacted_at: d.transacted_at,
      deleted_at: r.deleted_by_user_at,
      permanent_delete_at: r.permanent_delete_at,
    };
  });
}

// ── Recover ──────────────────────────────────────────────────────

export async function recoverTransaction(userId: string, id: string, lang: Lang) {
  const del = await pool.query(
    `SELECT permanent_delete_at FROM deleted_transactions WHERE id=$1 AND user_id=$2 AND is_recovered=FALSE`,
    [id, userId]
  );
  if (del.rowCount === 0) throw new AppError("TRANSACTION_NOT_FOUND", 404);
  if (new Date(del.rows[0].permanent_delete_at) <= new Date()) throw new AppError("RECOVERY_PERIOD_EXPIRED", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE transactions SET is_deleted=FALSE, deleted_at=NULL updated_at=NOW() WHERE id=$1 AND user_id=$2`, [id, userId]);
    await client.query(`UPDATE deleted_transactions SET is_recovered=TRUE, recovered_at=NOW() WHERE id=$1`, [id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return getTransaction(userId, id, lang);
}

// ── Search (hybrid) ──────────────────────────────────────────────

const SCAN_CAP = 500; // max rows decrypted per request on the slow path

const looksLikePhone = (q: string) => /^\d{7,}$/.test(q);

export async function searchTransactions(f: {
  userId: string;
  lang: Lang;
  q: string;
  phoneNumberIds?: string[];
  direction?: "in" | "out";
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}) {
  const q = (f.q ?? "").trim();
  if (!q) throw new AppError("SEARCH_QUERY_REQUIRED", 400);
  const limit = Math.min(Math.max(f.limit ?? 50, 10), 100);
  const dek = await loadDek(f.userId);

  const where: string[] = ["t.user_id = $1", "t.is_deleted = FALSE"];
  const params: any[] = [f.userId];
  if (f.phoneNumberIds?.length) { params.push(f.phoneNumberIds); where.push(`t.phone_number_id = ANY($${params.length}::uuid[])`); }
  if (f.direction) { params.push(f.direction); where.push(`t.direction = $${params.length}`); }
  if (f.dateFrom)  { params.push(f.dateFrom);  where.push(`t.transacted_date >= $${params.length}`); }
  if (f.dateTo)    { params.push(f.dateTo);    where.push(`t.transacted_date <= $${params.length}`); }

  const pushCursor = () => {
    if (!f.cursor) return;
    const c = decodeCursor(f.cursor);
    if (!c) return;
    params.push(c.transactedAt); const a = params.length;
    params.push(c.id);           const b = params.length;
    where.push(`(t.transacted_at, t.id) < ($${a}::timestamptz, $${b}::uuid)`);
  };

  // Fast path: a full phone number → blind-index hash match in SQL, no decryption.
  if (looksLikePhone(q)) {
    params.push(hashValue(q));
    where.push(`t.counterparty_phone_hash = $${params.length}`);
    pushCursor();
    params.push(limit + 1);
    const sql = `${SELECT_TX} WHERE ${where.join(" AND ")} ORDER BY t.transacted_at DESC, t.id DESC LIMIT $${params.length}`;
    let rows = (await pool.query(sql, params)).rows;
    const hasMore = rows.length > limit;
    if (hasMore) rows = rows.slice(0, limit);
    const last = rows[rows.length - 1];
    return {
      transactions: rows.map((r) => formatTx(r, dek, f.lang)),
      cursor: hasMore && last ? encodeCursor(new Date(last.transacted_at).toISOString(), last.id) : null,
      has_more: hasMore,
    };
  }

  // Slow path: name / partial → decrypt-and-scan, bounded by SCAN_CAP.
  pushCursor();
  params.push(SCAN_CAP);
  const sql = `${SELECT_TX} WHERE ${where.join(" AND ")} ORDER BY t.transacted_at DESC, t.id DESC LIMIT $${params.length}`;
  const batch = (await pool.query(sql, params)).rows;

  const needle = q.toLowerCase();
  const matches: any[] = [];
  for (const r of batch) {
    const tx = formatTx(r, dek, f.lang);
    const hay = `${tx.counterparty_name ?? ""} ${tx.counterparty_number ?? ""}`.toLowerCase();
    if (hay.includes(needle)) matches.push(tx);
    if (matches.length > limit) break;
  }

  if (matches.length > limit) {
    const limited = matches.slice(0, limit);
    const lastM = limited[limited.length - 1];
    return { transactions: limited, cursor: encodeCursor(new Date(lastM.transacted_at).toISOString(), lastM.id), has_more: true };
  }
  if (batch.length === SCAN_CAP) {
    const lastB = batch[batch.length - 1];
    return { transactions: matches, cursor: encodeCursor(new Date(lastB.transacted_at).toISOString(), lastB.id), has_more: true };
  }
  return { transactions: matches, cursor: null, has_more: false };
}