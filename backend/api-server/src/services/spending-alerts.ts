import { pool } from "../db";
import { AppError } from "../lib/errors";
import { Lang } from "../lib/messages";
import { enqueueStoredPush } from "../queue";


const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Spend in `categoryId` over the period window containing `anchorDate`
 * (weekly = Sat–Fri; monthly = calendar month), EAT. Feed-only (counts all).
 * Also reports whether the alert already fired in this window.
 */
async function computeSpend(
  userId: string, categoryId: string, period: string, anchorDate: string,
  lastAlerted: string | null, phoneNumberId: string | null
) {
  const params: any[] = [userId, categoryId, anchorDate, period, lastAlerted];
  let scope = "";
  if (phoneNumberId) { params.push(phoneNumberId); scope = `AND t.phone_number_id = $${params.length}`; }

  const r = (await pool.query(
    `WITH w AS (
       SELECT CASE WHEN $4='weekly'
                THEN ($3::date - ((EXTRACT(DOW FROM $3::date)::int + 1) % 7))
                ELSE date_trunc('month',$3::date)::date END AS s,
              CASE WHEN $4='weekly'
                THEN (($3::date - ((EXTRACT(DOW FROM $3::date)::int + 1) % 7)) + 6)
                ELSE (date_trunc('month',$3::date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date END AS f
     )
     SELECT w.s::text AS start, w.f::text AS "end",
            COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS spent,
            CASE WHEN $5::timestamptz IS NULL THEN FALSE
                 ELSE ($5::timestamptz AT TIME ZONE 'Africa/Mogadishu')::date >= w.s END AS already
     FROM w
     LEFT JOIN transactions t
       ON t.user_id=$1 AND t.category_id=$2 AND t.transacted_date BETWEEN w.s AND w.f ${scope}
     GROUP BY w.s, w.f`,
    params
  )).rows[0];
  return { start: r.start, end: r.end, spent: r.spent, already: r.already };
}

function shape(a: any, lang: Lang, progress: any) {
  const limit = Number(a.limit_amount);
  return {
    id: a.id,
    category: { id: a.category_id, name: lang === "so" ? a.name_so : a.name_en },
    phone_number_id: a.phone_number_id,
    phone_number: a.phone_number ?? null,
    period: a.period,
    limit_amount: limit,
    alert_threshold: Number(a.alert_threshold),
    is_active: a.is_active,
    last_alerted_at: a.last_alerted_at,
    progress: {
      spent: progress.spent,
      percent: limit > 0 ? Math.round((progress.spent / limit) * 1000) / 10 : 0,
      period_start: progress.start,
      period_end: progress.end,
    },
  };
}

export async function listAlerts(userId: string, lang: Lang) {
  const alerts = (await pool.query(
    `SELECT sa.id, sa.category_id, sa.phone_number_id, sa.period, sa.limit_amount, sa.alert_threshold,
            sa.is_active, sa.last_alerted_at, c.name_en, c.name_so, pn.number AS phone_number
     FROM spending_alerts sa
     JOIN categories c ON c.id = sa.category_id
     LEFT JOIN phone_numbers pn ON pn.id = sa.phone_number_id
     WHERE sa.user_id = $1 ORDER BY sa.created_at DESC`,
    [userId]
  )).rows;
  if (alerts.length === 0) return [];

  const today = (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;
  const out = [];
  for (const a of alerts) {
    const p = await computeSpend(userId, a.category_id, a.period, today, null, a.phone_number_id);
    out.push(shape(a, lang, p));
  }
  return out;
}

export async function createAlert(input: {
  userId: string; lang: Lang; categoryId: string; limitAmount: number;
  period?: "weekly" | "monthly"; alertThreshold?: number; phoneNumberId?: string;
}) {
  const { userId, lang, categoryId } = input;
  const period = input.period ?? "monthly";
  const threshold = input.alertThreshold ?? 80;
  if (!(input.limitAmount > 0)) throw new AppError("INVALID_LIMIT", 400, { field: "limitAmount" });

  const cat = await pool.query(
    `SELECT 1 FROM categories WHERE id=$1 AND (user_id=$2 OR user_id IS NULL) AND deleted_at IS NULL`,
    [categoryId, userId]
  );
  if (!cat.rowCount) throw new AppError("CATEGORY_NOT_FOUND", 404, { field: "categoryId" });

  if (input.phoneNumberId) {
    const pn = await pool.query(
      `SELECT 1 FROM phone_numbers WHERE id=$1 AND user_id=$2 AND is_active=TRUE AND deleted_at IS NULL`,
      [input.phoneNumberId, userId]
    );
    if (!pn.rowCount) throw new AppError("PHONE_NOT_FOUND", 404, { field: "phoneNumberId" });
  }

  const dup = await pool.query(
    `SELECT 1 FROM spending_alerts
     WHERE user_id=$1 AND category_id=$2 AND period=$3 AND phone_number_id IS NOT DISTINCT FROM $4`,
    [userId, categoryId, period, input.phoneNumberId ?? null]
  );
  if (dup.rowCount) throw new AppError("ALERT_ALREADY_EXISTS", 409);

  const id = (await pool.query(
    `INSERT INTO spending_alerts (user_id, phone_number_id, category_id, limit_amount, alert_threshold, period)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, input.phoneNumberId ?? null, categoryId, input.limitAmount, threshold, period]
  )).rows[0].id;

  return getAlert(userId, lang, id);
}

export async function getAlert(userId: string, lang: Lang, id: string) {
  const a = (await pool.query(
    `SELECT sa.id, sa.category_id, sa.phone_number_id, sa.period, sa.limit_amount, sa.alert_threshold,
            sa.is_active, sa.last_alerted_at, c.name_en, c.name_so, pn.number AS phone_number
     FROM spending_alerts sa
     JOIN categories c ON c.id = sa.category_id
     LEFT JOIN phone_numbers pn ON pn.id = sa.phone_number_id
     WHERE sa.id=$1 AND sa.user_id=$2`,
    [id, userId]
  )).rows[0];
  if (!a) throw new AppError("ALERT_NOT_FOUND", 404);
  const today = (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;
  const p = await computeSpend(userId, a.category_id, a.period, today, null, a.phone_number_id);
  return shape(a, lang, p);
}

export async function updateAlert(input: {
  userId: string; lang: Lang; id: string; limitAmount?: number; alertThreshold?: number; isActive?: boolean;
}) {
  const { userId, lang, id } = input;
  const owned = await pool.query(`SELECT id FROM spending_alerts WHERE id=$1 AND user_id=$2`, [id, userId]);
  if (!owned.rowCount) throw new AppError("ALERT_NOT_FOUND", 404);

  if (input.limitAmount !== undefined) {
    if (!(input.limitAmount > 0)) throw new AppError("INVALID_LIMIT", 400, { field: "limitAmount" });
    await pool.query(`UPDATE spending_alerts SET limit_amount=$1, updated_at=NOW() WHERE id=$2`, [input.limitAmount, id]);
  }
  if (input.alertThreshold !== undefined)
    await pool.query(`UPDATE spending_alerts SET alert_threshold=$1, updated_at=NOW() WHERE id=$2`, [input.alertThreshold, id]);
  if (input.isActive !== undefined)
    await pool.query(`UPDATE spending_alerts SET is_active=$1, updated_at=NOW() WHERE id=$2`, [input.isActive, id]);

  return getAlert(userId, lang, id);
}

export async function deleteAlert(userId: string, id: string) {
  const r = await pool.query(`DELETE FROM spending_alerts WHERE id=$1 AND user_id=$2 RETURNING id`, [id, userId]);
  if (!r.rowCount) throw new AppError("ALERT_NOT_FOUND", 404);
}

// ── Evaluation (called when a transaction is categorized) ──

export async function evaluateSpendingAlerts(userId: string, transactionId: string): Promise<void> {
  const tx = (await pool.query(
    `SELECT category_id, phone_number_id, transacted_date::text AS d FROM transactions WHERE id=$1 AND user_id=$2`,
    [transactionId, userId]
  )).rows[0];
  if (!tx || !tx.category_id) return;

  const alerts = (await pool.query(
    `SELECT sa.id, sa.period, sa.limit_amount::float AS limit_amount, sa.alert_threshold::float AS threshold,
            sa.phone_number_id, sa.last_alerted_at, c.name_en AS cat_en, c.name_so AS cat_so
     FROM spending_alerts sa
     JOIN categories c ON c.id = sa.category_id
     WHERE sa.user_id=$1 AND sa.category_id=$2 AND sa.is_active=TRUE
       AND (sa.phone_number_id IS NULL OR sa.phone_number_id=$3)`,
    [userId, tx.category_id, tx.phone_number_id]
  )).rows;

  for (const a of alerts) {
    const w = await computeSpend(userId, tx.category_id, a.period, tx.d, a.last_alerted_at, a.phone_number_id);
    const trigger = a.limit_amount * (a.threshold / 100);
    if (w.spent < trigger || w.already) continue;

    const pct = Math.round((w.spent / a.limit_amount) * 100);
    const periodEn = a.period === "weekly" ? "weekly" : "monthly";
    const periodSo = a.period === "weekly" ? "todobaadlaha" : "bishii";

    const notif = await pool.query(
      `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
       VALUES ($1,'spending_alert',$2,$3,$4,$5,$6) RETURNING id`,
      [
        userId,
        "Budget alert", "Digniin Mizaaniyad",
        `You've used ${pct}% of your ${periodEn} ${a.cat_en} budget (${money(w.spent)} of ${money(a.limit_amount)}).`,
        `Waxaad isticmaashay ${pct}% mizaaniyaddaada ${periodSo} ee ${a.cat_so} (${money(w.spent)} oo ka mid ah ${money(a.limit_amount)}).`,
        JSON.stringify({ screen: "spending_alert", alert_id: a.id, category_id: tx.category_id, period: a.period }),
      ]
    );
    await pool.query(`UPDATE spending_alerts SET last_alerted_at=NOW(), updated_at=NOW() WHERE id=$1`, [a.id]);
    await enqueueStoredPush(notif.rows[0].id, userId);


    // await pool.query(
    //   `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
    //    VALUES ($1,'spending_alert',$2,$3,$4,$5,$6)`,
    //   [
    //     userId,
    //     "Budget alert", "Digniin Mizaaniyad",
    //     `You've used ${pct}% of your ${periodEn} ${a.cat_en} budget (${money(w.spent)} of ${money(a.limit_amount)}).`,
    //     `Waxaad isticmaashay ${pct}% mizaaniyaddaada ${periodSo} ee ${a.cat_so} (${money(w.spent)} oo ka mid ah ${money(a.limit_amount)}).`,
    //     JSON.stringify({ screen: "spending_alert", alert_id: a.id, category_id: tx.category_id, period: a.period }),
    //   ]
    // );
    // await pool.query(`UPDATE spending_alerts SET last_alerted_at=NOW(), updated_at=NOW() WHERE id=$1`, [a.id]);
  }
}