import { pool } from "../db";
import { getUserDek, decryptField, encryptField, hashValue, canonicalPhone } from "../encryption";
import { AppError } from "../lib/errors";
import { Lang } from "../lib/messages";
import { encodeCursor, decodeCursor } from "../utils/cursor";
import { PoolClient } from "pg";

// Full international Somali format required (matches what telecoms put in counterparty.phone).
const PHONE_RE = /^252\d{6,12}$/;
function assertNumber(n: string) {
  if (!PHONE_RE.test(n)) throw new AppError("INVALID_TRACKED_NUMBER", 400, { field: "number" });
}

async function loadDek(userId: string): Promise<Buffer | null> {
  try { return await getUserDek(userId); } catch { return null; }
}
function decryptNum(enc: string, dek: Buffer | null): { number: string | null; available: boolean } {
  if (!dek) return { number: null, available: false };
  try { return { number: decryptField(enc, dek), available: true }; }
  catch { return { number: null, available: false }; }
}

/** Attach a number to a contact: validate, hash, reuse a deactivated row, else insert. */
async function attachNumber(client: PoolClient, userId: string, contactId: string, number: string, dek: Buffer) {
  assertNumber(number);
  // const hash = hashValue(number);
  const hash = hashValue(canonicalPhone(number));
  const existing = await client.query(
    `SELECT id, is_active FROM tracked_contact_numbers WHERE user_id=$1 AND tracked_number_hash=$2`,
    [userId, hash]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const e = existing.rows[0];
    if (e.is_active) throw new AppError("NUMBER_ALREADY_TRACKED", 409);
    // It was removed before — re-activate it under this contact (UNIQUE is on user+hash).
    await client.query(
      `UPDATE tracked_contact_numbers
       SET contact_id=$1, is_active=TRUE, total_sent=0, total_received=0, transaction_count=0, last_transaction_at=NULL
       WHERE id=$2`,
      [contactId, e.id]
    );
    return;
  }
  await client.query(
    `INSERT INTO tracked_contact_numbers (contact_id, user_id, tracked_number_enc, tracked_number_hash)
     VALUES ($1,$2,$3,$4)`,
    [contactId, userId, encryptField(number, dek), hash]
  );
}

/** All-time, direction-aware totals per contact, computed from transactions by hash. */
async function totalsByContact(userId: string): Promise<Map<string, any>> {
  const rows = (await pool.query(
    `SELECT tcn.contact_id,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND tc.tracking_direction IN ('sent','both')),0)::float    AS total_sent,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND tc.tracking_direction IN ('received','both')),0)::float AS total_received,
       COUNT(*) FILTER (WHERE (t.direction='out' AND tc.tracking_direction IN ('sent','both'))
                           OR (t.direction='in'  AND tc.tracking_direction IN ('received','both')))::int AS transaction_count,
       MAX(t.transacted_at) FILTER (WHERE (t.direction='out' AND tc.tracking_direction IN ('sent','both'))
                                       OR (t.direction='in'  AND tc.tracking_direction IN ('received','both'))) AS last_transaction_at
     FROM tracked_contact_numbers tcn
     JOIN tracked_contacts tc ON tc.id = tcn.contact_id AND tc.deleted_at IS NULL
     JOIN transactions t ON t.user_id = tcn.user_id AND t.counterparty_phone_hash = tcn.tracked_number_hash
     WHERE tcn.user_id = $1 AND tcn.is_active = TRUE
     GROUP BY tcn.contact_id`,
    [userId]
  )).rows;
  const m = new Map<string, any>();
  for (const r of rows) m.set(r.contact_id, r);
  return m;
}

function shapeContact(c: any, numbers: any[], totals: any, dek: Buffer | null) {
  const t = totals ?? { total_sent: 0, total_received: 0, transaction_count: 0, last_transaction_at: null };
  return {
    id: c.id,
    label: c.label,
    tracking_direction: c.tracking_direction,
    is_active: c.is_active,
    created_at: c.created_at,
    total_sent: t.total_sent,
    total_received: t.total_received,
    net: t.total_received - t.total_sent,
    transaction_count: t.transaction_count,
    last_transaction_at: t.last_transaction_at,
    numbers: numbers
      .filter((n) => n.contact_id === c.id)
      .map((n) => ({ id: n.id, ...decryptNum(n.tracked_number_enc, dek) })),
  };
}

export async function listContacts(userId: string) {
  const contacts = (await pool.query(
    `SELECT id, label, tracking_direction, is_active, created_at
     FROM tracked_contacts WHERE user_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [userId]
  )).rows;
  const numbers = (await pool.query(
    `SELECT id, contact_id, tracked_number_enc FROM tracked_contact_numbers WHERE user_id=$1 AND is_active=TRUE`,
    [userId]
  )).rows;
  const totals = await totalsByContact(userId);
  const dek = await loadDek(userId);
  return contacts.map((c) => shapeContact(c, numbers, totals.get(c.id), dek));
}

export async function getContact(userId: string, id: string) {
  const c = (await pool.query(
    `SELECT id, label, tracking_direction, is_active, created_at
     FROM tracked_contacts WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
    [id, userId]
  )).rows[0];
  if (!c) throw new AppError("CONTACT_NOT_FOUND", 404);
  const numbers = (await pool.query(
    `SELECT id, contact_id, tracked_number_enc FROM tracked_contact_numbers WHERE contact_id=$1 AND is_active=TRUE`,
    [id]
  )).rows;
  const totals = await totalsByContact(userId);
  const dek = await loadDek(userId);
  return shapeContact(c, numbers, totals.get(id), dek);
}

export async function createContact(input: {
  userId: string; label: string; trackingDirection?: "sent" | "received" | "both"; phoneNumbers: string[];
}) {
  const { userId, label } = input;
  const direction = input.trackingDirection ?? "both";
  const nums = Array.from(new Set((input.phoneNumbers ?? []).map((n) => n.trim()).filter(Boolean)));
  if (nums.length === 0) throw new AppError("INVALID_TRACKED_NUMBER", 400, { field: "phoneNumbers" });
  nums.forEach(assertNumber);

  const dek = await getUserDek(userId);
  const client = await pool.connect();
  let id: string;
  try {
    await client.query("BEGIN");
    id = (await client.query(
      `INSERT INTO tracked_contacts (user_id, label, tracking_direction) VALUES ($1,$2,$3) RETURNING id`,
      [userId, label, direction]
    )).rows[0].id;
    for (const n of nums) await attachNumber(client, userId, id, n, dek);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return getContact(userId, id!);
}

export async function updateContact(input: {
  userId: string; id: string; label?: string; trackingDirection?: "sent" | "received" | "both"; isActive?: boolean;
}) {
  const { userId, id } = input;
  const owned = await pool.query(`SELECT id FROM tracked_contacts WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`, [id, userId]);
  if (!owned.rowCount) throw new AppError("CONTACT_NOT_FOUND", 404);

  if (input.label !== undefined)            await pool.query(`UPDATE tracked_contacts SET label=$1, updated_at=NOW() WHERE id=$2`, [input.label, id]);
  if (input.trackingDirection !== undefined) await pool.query(`UPDATE tracked_contacts SET tracking_direction=$1, updated_at=NOW() WHERE id=$2`, [input.trackingDirection, id]);
  if (input.isActive !== undefined)          await pool.query(`UPDATE tracked_contacts SET is_active=$1, updated_at=NOW() WHERE id=$2`, [input.isActive, id]);

  return getContact(userId, id);
}

export async function deleteContact(userId: string, id: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `UPDATE tracked_contacts SET deleted_at=NOW(), is_active=FALSE, updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id`,
      [id, userId]
    );
    if (!r.rowCount) throw new AppError("CONTACT_NOT_FOUND", 404);
    await client.query(`UPDATE tracked_contact_numbers SET is_active=FALSE WHERE contact_id=$1`, [id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function addNumber(userId: string, contactId: string, number: string) {
  const owned = await pool.query(`SELECT id FROM tracked_contacts WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`, [contactId, userId]);
  if (!owned.rowCount) throw new AppError("CONTACT_NOT_FOUND", 404);
  const dek = await getUserDek(userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await attachNumber(client, userId, contactId, number, dek);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return getContact(userId, contactId);
}

export async function removeNumber(userId: string, contactId: string, numberId: string) {
  const r = await pool.query(
    `UPDATE tracked_contact_numbers SET is_active=FALSE
     WHERE id=$1 AND contact_id=$2 AND user_id=$3 AND is_active=TRUE RETURNING id`,
    [numberId, contactId, userId]
  );
  if (!r.rowCount) throw new AppError("TRACKED_NUMBER_NOT_FOUND", 404);
}

// ── Timeline: every transaction with this contact's numbers ──

export async function getContactTransactions(
  userId: string, lang: Lang, contactId: string,
  cursor?: string, limit?: number,
  filters?: { numberIds?: string[]; dateFrom?: string; dateTo?: string }
) {
  const c = (await pool.query(
    `SELECT tracking_direction FROM tracked_contacts WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
    [contactId, userId]
  )).rows[0];
  if (!c) throw new AppError("CONTACT_NOT_FOUND", 404);

  const numRows = (await pool.query(
    `SELECT id, tracked_number_hash FROM tracked_contact_numbers WHERE contact_id=$1 AND user_id=$2 AND is_active=TRUE`,
    [contactId, userId]
  )).rows;

  let hashes = numRows.map((r) => r.tracked_number_hash);
  if (filters?.numberIds?.length) {
    const set = new Set(filters.numberIds);
    hashes = numRows.filter((r) => set.has(r.id)).map((r) => r.tracked_number_hash);
  }
  const emptySummary = { total_sent: 0, total_received: 0, net: 0, transaction_count: 0 };
  if (hashes.length === 0) return { transactions: [], cursor: null, has_more: false, summary: emptySummary };

  // base filter (shared by the summary and the page) — everything except cursor/limit
  const baseParams: any[] = [userId, hashes];
  const baseWhere: string[] = [`t.user_id=$1`, `t.counterparty_phone_hash = ANY($2::varchar[])`];
  if (c.tracking_direction === "sent") baseWhere.push(`t.direction='out'`);
  else if (c.tracking_direction === "received") baseWhere.push(`t.direction='in'`);
  if (filters?.dateFrom) { baseParams.push(filters.dateFrom); baseWhere.push(`t.transacted_date >= $${baseParams.length}`); }
  if (filters?.dateTo)   { baseParams.push(filters.dateTo);   baseWhere.push(`t.transacted_date <= $${baseParams.length}`); }

  // totals over the whole filtered set (only needed on the first page)
  let summary = emptySummary;
  if (!cursor) {
    const s = (await pool.query(
      `SELECT COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS total_sent,
              COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'),0)::float  AS total_received,
              COUNT(*)::int AS transaction_count
       FROM transactions t
       WHERE ${baseWhere.join(" AND ")}`,
      baseParams
    )).rows[0];
    summary = { total_sent: s.total_sent, total_received: s.total_received, net: s.total_received - s.total_sent, transaction_count: s.transaction_count };
  }

  // the page itself
  const lim = Math.min(Math.max(limit ?? 50, 10), 100);
  const params = [...baseParams];
  const where = [...baseWhere];
  if (cursor) {
    const cur = decodeCursor(cursor);
    if (cur) {
      params.push(cur.transactedAt); const a = params.length;
      params.push(cur.id);           const b = params.length;
      where.push(`(t.transacted_at, t.id) < ($${a}::timestamptz, $${b}::uuid)`);
    }
  }
  params.push(lim + 1);

  const res = await pool.query(
    // `SELECT t.id, t.amount::float AS amount, t.currency, t.direction, t.type,
    //         t.counterparty_name_enc, t.counterparty_phone_enc, t.note, t.transacted_at, t.transacted_date,
    //         t.category_id, c.name_en AS category_name_en, c.name_so AS category_name_so
    //  FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    //  WHERE ${where.join(" AND ")}
    //  ORDER BY t.transacted_at DESC, t.id DESC LIMIT $${params.length}`
    `SELECT t.id, t.amount::float AS amount, t.currency, t.direction, t.type, t.phone_number_id,
            t.counterparty_name_enc, t.counterparty_phone_enc, t.note, t.transacted_at, t.transacted_date,
            t.category_id, c.name_en AS category_name_en, c.name_so AS category_name_so
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where.join(" AND ")}
     ORDER BY t.transacted_at DESC, t.id DESC LIMIT $${params.length}`,
    params
  );

  

  const dek = await loadDek(userId);
  let rows = res.rows;
  const hasMore = rows.length > lim;
  if (hasMore) rows = rows.slice(0, lim);

  const decode = (row: any) => {
    let name: string | null = null, number: string | null = null, available = true;
    const hasCipher = !!(row.counterparty_name_enc || row.counterparty_phone_enc);
    if (hasCipher && !dek) available = false;
    else if (hasCipher) {
      try {
        if (row.counterparty_name_enc)  name = decryptField(row.counterparty_name_enc, dek!);
        if (row.counterparty_phone_enc) number = decryptField(row.counterparty_phone_enc, dek!);
      } catch { name = null; number = null; available = false; }
    }
    return { name, number, available };
  };

  const transactions = rows.map((r) => {
    const cp = decode(r);
    // return {
    //   id: r.id, amount: r.amount, currency: r.currency, direction: r.direction, type: r.type,
    //   counterparty_name: cp.name, counterparty_number: cp.number, counterparty_available: cp.available,
    //   category: r.category_id ? { id: r.category_id, name: lang === "so" ? r.category_name_so : r.category_name_en } : null,
    //   note: r.note ?? null, transacted_at: r.transacted_at, transacted_date: r.transacted_date,
    // };
    return {
      id: r.id, amount: r.amount, currency: r.currency, direction: r.direction, type: r.type,
      phone_number_id: r.phone_number_id ?? null,
      counterparty_name: cp.name, counterparty_number: cp.number, counterparty_available: cp.available,
      category: r.category_id ? { id: r.category_id, name: lang === "so" ? r.category_name_so : r.category_name_en } : null,
      note: r.note ?? null, transacted_at: r.transacted_at, transacted_date: r.transacted_date,
    };
  });

  const last = rows[rows.length - 1];
  const next = hasMore && last ? encodeCursor(new Date(last.transacted_at).toISOString(), last.id) : null;
  return { transactions, cursor: next, has_more: hasMore, summary };
}


// Per-contact sent/received within a date window (for report period sections). Only contacts with activity.
export async function contactTotalsInWindow(userId: string, start: string, end: string) {
  const rows = (await pool.query(
    `SELECT tc.id, tc.label,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND tc.tracking_direction IN ('sent','both')),0)::float    AS total_sent,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND tc.tracking_direction IN ('received','both')),0)::float AS total_received,
       COUNT(*) FILTER (WHERE (t.direction='out' AND tc.tracking_direction IN ('sent','both'))
                           OR (t.direction='in'  AND tc.tracking_direction IN ('received','both')))::int AS transaction_count
     FROM tracked_contacts tc
     JOIN tracked_contact_numbers tcn ON tcn.contact_id = tc.id AND tcn.is_active = TRUE
     JOIN transactions t ON t.user_id = tcn.user_id AND t.counterparty_phone_hash = tcn.tracked_number_hash
     WHERE tc.user_id=$1 AND tc.deleted_at IS NULL AND t.transacted_date BETWEEN $2 AND $3
     GROUP BY tc.id, tc.label
     HAVING COUNT(*) FILTER (WHERE (t.direction='out' AND tc.tracking_direction IN ('sent','both'))
                                OR (t.direction='in'  AND tc.tracking_direction IN ('received','both'))) > 0
     ORDER BY (COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0) + COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'),0)) DESC`,
    [userId, start, end]
  )).rows;
  return rows.map((r) => ({ id: r.id, label: r.label, total_sent: r.total_sent, total_received: r.total_received, count: r.transaction_count }));
}