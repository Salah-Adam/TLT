import { pool } from "../db";
import { Lang, t } from "../lib/messages";

/**
 * FEED-ONLY HIDE: analytics counts ALL transactions, including soft-deleted ones.
 * Delete hides from the feed list, not from reality. DO NOT add an is_deleted filter.
 */

interface Scope {
  phoneNumberIds?: string[];
  provider?: string;
  type?: string;
  categoryId?: string;
}

/** Build the optional scope AND-clauses, appending params. */
function scopeFilters(s: Scope, params: any[]): string {
  const parts: string[] = [];
  if (s.phoneNumberIds?.length) { params.push(s.phoneNumberIds); parts.push(`AND t.phone_number_id = ANY($${params.length}::uuid[])`); }
  if (s.provider)   { params.push(s.provider);   parts.push(`AND t.provider = $${params.length}`); }
  if (s.type)       { params.push(s.type);       parts.push(`AND t.type = $${params.length}`); }
  if (s.categoryId) { params.push(s.categoryId); parts.push(`AND t.category_id = $${params.length}`); }
  return parts.join(" ");
}

const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

// ── Dashboard ──

export async function getDashboard(userId: string, scope: Scope = {}) {
  const tParams: any[] = [userId];
  const tf = scopeFilters(scope, tParams);

  const totals = await pool.query(
    `WITH b AS (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS today)
     SELECT
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date = b.today),0)::float AS today_in,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date = b.today),0)::float AS today_out,
       COUNT(*) FILTER (WHERE t.transacted_date = b.today)::int AS today_count,

       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date >  b.today - 7),0)::float AS week_in,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date >  b.today - 7),0)::float AS week_out,
       COUNT(*) FILTER (WHERE t.transacted_date > b.today - 7)::int AS week_count,

       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date > b.today - 14 AND t.transacted_date <= b.today - 7),0)::float AS pweek_in,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date > b.today - 14 AND t.transacted_date <= b.today - 7),0)::float AS pweek_out,

       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND date_trunc('month',t.transacted_date)=date_trunc('month',b.today)),0)::float AS month_in,
       COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND date_trunc('month',t.transacted_date)=date_trunc('month',b.today)),0)::float AS month_out,
       COUNT(*) FILTER (WHERE date_trunc('month',t.transacted_date)=date_trunc('month',b.today))::int AS month_count
     FROM transactions t, b
     WHERE t.user_id = $1 ${tf}`,
    tParams
  );
  const r = totals.rows[0];

  // Balances: only wallet-level scope (numbers + provider); type/category don't apply.
  const bParams: any[] = [userId];
  const bf = scopeFilters({ phoneNumberIds: scope.phoneNumberIds, provider: scope.provider }, bParams);
  const balances = await pool.query(
    `SELECT DISTINCT ON (t.phone_number_id)
            t.phone_number_id, pn.number, pn.provider, t.balance_after::float AS estimated_balance
     FROM transactions t
     JOIN phone_numbers pn ON pn.id = t.phone_number_id
     WHERE t.user_id = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL ${bf}
     ORDER BY t.phone_number_id, t.transacted_at DESC`,
    bParams
  );

  return {
    today: { total_in: r.today_in, total_out: r.today_out, net: r.today_in - r.today_out, transaction_count: r.today_count },
    this_week: {
      total_in: r.week_in, total_out: r.week_out, net: r.week_in - r.week_out, transaction_count: r.week_count,
      vs_last_week: { in_change_percent: pct(r.week_in, r.pweek_in), out_change_percent: pct(r.week_out, r.pweek_out) },
    },
    this_month: { total_in: r.month_in, total_out: r.month_out, net: r.month_in - r.month_out, transaction_count: r.month_count },
    estimated_balances: balances.rows,
  };
}

// ── Daily ──

export async function getDaily(userId: string, lang: Lang, date?: string, scope: Scope = {}) {
  const day = date ?? (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;

  const params: any[] = [userId, day];
  const f = scopeFilters(scope, params);

  const totalsQ = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
       COUNT(*)::int                                  AS transaction_count,
       COUNT(*) FILTER (WHERE direction='in')::int    AS count_in,
       COUNT(*) FILTER (WHERE direction='out')::int   AS count_out,
       MAX(amount) FILTER (WHERE direction='in')::float  AS largest_in,
       MAX(amount) FILTER (WHERE direction='out')::float AS largest_out
     FROM transactions t
     WHERE t.user_id=$1 AND t.transacted_date=$2 ${f}`,
    params
  );
  const tt = totalsQ.rows[0];

  const cats = await pool.query(
    `SELECT t.category_id, c.name_en, c.name_so, SUM(t.amount)::float AS amount, COUNT(*)::int AS count
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id=$1 AND t.transacted_date=$2 AND t.direction='out' ${f}
     GROUP BY t.category_id, c.name_en, c.name_so ORDER BY amount DESC`,
    params
  );

  const hours = await pool.query(
    `SELECT t.transacted_hour AS hour,
            COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
            COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
            COUNT(*)::int AS count
     FROM transactions t
     WHERE t.user_id=$1 AND t.transacted_date=$2 ${f}
     GROUP BY t.transacted_hour ORDER BY hour`,
    params
  );

  return {
    date: day,
    total_in: tt.total_in, total_out: tt.total_out, net: tt.total_in - tt.total_out,
    transaction_count: tt.transaction_count, count_in: tt.count_in, count_out: tt.count_out,
    largest_in: tt.largest_in, largest_out: tt.largest_out,
    by_category: cats.rows.map((c) => ({
      category_id: c.category_id,
      name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
      amount: c.amount, count: c.count,
    })),
    by_hour: hours.rows,
  };
}

// ── Monthly ──

export async function getMonthly(userId: string, lang: Lang, year?: number, month?: number, scope: Scope = {}) {
  if (!year || !month) {
    const nowm = (await pool.query(
      `SELECT EXTRACT(YEAR FROM d)::int AS y, EXTRACT(MONTH FROM d)::int AS m
       FROM (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS d) s`
    )).rows[0];
    year = year ?? nowm.y;
    month = month ?? nowm.m;
  }

  const params: any[] = [userId, year, month];
  const f = scopeFilters(scope, params);
  const monthWhere = `t.user_id=$1
     AND EXTRACT(YEAR FROM t.transacted_date)=$2 AND EXTRACT(MONTH FROM t.transacted_date)=$3 ${f}`;

  const totalsQ = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
       COUNT(*)::int AS transaction_count
     FROM transactions t WHERE ${monthWhere}`,
    params
  );
  const tt = totalsQ.rows[0];

  const cats = await pool.query(
    `SELECT t.category_id, c.name_en, c.name_so, SUM(t.amount)::float AS amount, COUNT(*)::int AS count
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${monthWhere} AND t.direction='out'
     GROUP BY t.category_id, c.name_en, c.name_so ORDER BY amount DESC`,
    params
  );

  const trend = await pool.query(
    `SELECT t.transacted_date::text AS date,
            COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
            COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
            COUNT(*)::int AS count
     FROM transactions t WHERE ${monthWhere}
     GROUP BY t.transacted_date ORDER BY date`,
    params
  );

  const busiestHourQ = await pool.query(
    `SELECT t.transacted_hour AS hour, COUNT(*)::int AS count
     FROM transactions t WHERE ${monthWhere}
     GROUP BY t.transacted_hour ORDER BY count DESC, hour ASC LIMIT 1`,
    params
  );

  const busiestDay = trend.rows.reduce(
    (max, d) => (d.count > (max?.count ?? -1) ? d : max),
    null as null | { date: string; count: number }
  );

  return {
    year, month,
    total_in: tt.total_in, total_out: tt.total_out, net: tt.total_in - tt.total_out,
    transaction_count: tt.transaction_count,
    busiest_day: busiestDay ? busiestDay.date : null,
    busiest_hour: busiestHourQ.rows[0]?.hour ?? null,
    by_category: cats.rows.map((c) => ({
      category_id: c.category_id,
      name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
      amount: c.amount, count: c.count,
    })),
    daily_trend: trend.rows.map((d) => ({ date: d.date, total_in: d.total_in, total_out: d.total_out, count: d.count })),
  };
}

// - ---------------------------------------------

// import { pool } from "../db";
// import { Lang, t } from "../lib/messages";

// /**
//  * FEED-ONLY HIDE: analytics intentionally counts ALL transactions, including
//  * soft-deleted ones. Deleting a transaction removes it from the user's feed
//  * (the list endpoint filters is_deleted = FALSE), NOT from reality — the money
//  * still moved. This also makes these on-demand numbers identical to the
//  * pre-computed summary tables. DO NOT add an is_deleted filter here.
//  */

// /** Optional phone-number filter shared by all queries. Appends the param, returns the SQL fragment. */
// function phoneFilter(phoneNumberIds: string[] | undefined, params: any[]): string {
//   if (!phoneNumberIds?.length) return "";
//   params.push(phoneNumberIds);
//   return `AND t.phone_number_id = ANY($${params.length}::uuid[])`;
// }

// const pct = (cur: number, prev: number): number | null =>
//   prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

// // ── Dashboard: today / this-week (rolling 7d) / this-month + balances ──

// export async function getDashboard(userId: string, phoneNumberIds?: string[]) {
//   const params: any[] = [userId];
//   const pn = phoneFilter(phoneNumberIds, params);

//   const totals = await pool.query(
//     `WITH b AS (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS today)
//      SELECT
//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date = b.today),0)::float AS today_in,
//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date = b.today),0)::float AS today_out,
//        COUNT(*) FILTER (WHERE t.transacted_date = b.today)::int AS today_count,

//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date >  b.today - 7),0)::float AS week_in,
//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date >  b.today - 7),0)::float AS week_out,
//        COUNT(*) FILTER (WHERE t.transacted_date > b.today - 7)::int AS week_count,

//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND t.transacted_date > b.today - 14 AND t.transacted_date <= b.today - 7),0)::float AS pweek_in,
//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND t.transacted_date > b.today - 14 AND t.transacted_date <= b.today - 7),0)::float AS pweek_out,

//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'  AND date_trunc('month',t.transacted_date)=date_trunc('month',b.today)),0)::float AS month_in,
//        COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out' AND date_trunc('month',t.transacted_date)=date_trunc('month',b.today)),0)::float AS month_out,
//        COUNT(*) FILTER (WHERE date_trunc('month',t.transacted_date)=date_trunc('month',b.today))::int AS month_count
//      FROM transactions t, b
//      WHERE t.user_id = $1 ${pn}`,
//     params
//   );
//   const r = totals.rows[0];

//   // Estimated balance per active number = balance_after of its most recent transaction.
//   const balances = await pool.query(
//     `SELECT DISTINCT ON (t.phone_number_id)
//             t.phone_number_id, pn.number, pn.provider, t.balance_after::float AS estimated_balance
//      FROM transactions t
//      JOIN phone_numbers pn ON pn.id = t.phone_number_id
//      WHERE t.user_id = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL ${pn}
//      ORDER BY t.phone_number_id, t.transacted_at DESC`,
//     params
//   );

//   return {
//     today: { total_in: r.today_in, total_out: r.today_out, net: r.today_in - r.today_out, transaction_count: r.today_count },
//     this_week: {
//       total_in: r.week_in, total_out: r.week_out, net: r.week_in - r.week_out, transaction_count: r.week_count,
//       vs_last_week: { in_change_percent: pct(r.week_in, r.pweek_in), out_change_percent: pct(r.week_out, r.pweek_out) },
//     },
//     this_month: { total_in: r.month_in, total_out: r.month_out, net: r.month_in - r.month_out, transaction_count: r.month_count },
//     estimated_balances: balances.rows,
//   };
// }

// // ── Daily breakdown ──

// export async function getDaily(userId: string, lang: Lang, date?: string, phoneNumberIds?: string[]) {
//   const day = date ?? (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;

//   const params: any[] = [userId, day];
//   const pn = phoneFilter(phoneNumberIds, params);

//   const totalsQ = await pool.query(
//     `SELECT
//        COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
//        COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
//        COUNT(*)::int                                  AS transaction_count,
//        COUNT(*) FILTER (WHERE direction='in')::int    AS count_in,
//        COUNT(*) FILTER (WHERE direction='out')::int   AS count_out,
//        MAX(amount) FILTER (WHERE direction='in')::float  AS largest_in,
//        MAX(amount) FILTER (WHERE direction='out')::float AS largest_out
//      FROM transactions t
//      WHERE t.user_id=$1 AND t.transacted_date=$2 ${pn}`,
//     params
//   );
//   const tt = totalsQ.rows[0];

//   const cats = await pool.query(
//     `SELECT t.category_id, c.name_en, c.name_so,
//             SUM(t.amount)::float AS amount, COUNT(*)::int AS count
//      FROM transactions t
//      LEFT JOIN categories c ON c.id = t.category_id
//      WHERE t.user_id=$1 AND t.transacted_date=$2 AND t.direction='out' ${pn}
//      GROUP BY t.category_id, c.name_en, c.name_so
//      ORDER BY amount DESC`,
//     params
//   );

//   const hours = await pool.query(
//     `SELECT t.transacted_hour AS hour,
//             COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
//             COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
//             COUNT(*)::int AS count
//      FROM transactions t
//      WHERE t.user_id=$1 AND t.transacted_date=$2 ${pn}
//      GROUP BY t.transacted_hour ORDER BY hour`,
//     params
//   );

//   return {
//     date: day,
//     total_in: tt.total_in, total_out: tt.total_out, net: tt.total_in - tt.total_out,
//     transaction_count: tt.transaction_count, count_in: tt.count_in, count_out: tt.count_out,
//     largest_in: tt.largest_in, largest_out: tt.largest_out,
//     by_category: cats.rows.map((c) => ({
//       category_id: c.category_id,
//       name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
//       amount: c.amount, count: c.count,
//     })),
//     by_hour: hours.rows,
//   };
// }

// // ── Monthly breakdown ──

// export async function getMonthly(userId: string, lang: Lang, year?: number, month?: number, phoneNumberIds?: string[]) {
//   if (!year || !month) {
//     const nowm = (await pool.query(
//       `SELECT EXTRACT(YEAR FROM d)::int AS y, EXTRACT(MONTH FROM d)::int AS m
//        FROM (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS d) s`
//     )).rows[0];
//     year = year ?? nowm.y;
//     month = month ?? nowm.m;
//   }

//   const params: any[] = [userId, year, month];
//   const pn = phoneFilter(phoneNumberIds, params);
//   const monthWhere = `t.user_id=$1
//      AND EXTRACT(YEAR FROM t.transacted_date)=$2 AND EXTRACT(MONTH FROM t.transacted_date)=$3 ${pn}`;

//   const totalsQ = await pool.query(
//     `SELECT
//        COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
//        COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
//        COUNT(*)::int AS transaction_count
//      FROM transactions t WHERE ${monthWhere}`,
//     params
//   );
//   const tt = totalsQ.rows[0];

//   const cats = await pool.query(
//     `SELECT t.category_id, c.name_en, c.name_so, SUM(t.amount)::float AS amount, COUNT(*)::int AS count
//      FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
//      WHERE ${monthWhere} AND t.direction='out'
//      GROUP BY t.category_id, c.name_en, c.name_so ORDER BY amount DESC`,
//     params
//   );

//   const trend = await pool.query(
//     `SELECT t.transacted_date::text AS date,
//             COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
//             COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
//             COUNT(*)::int AS count
//      FROM transactions t WHERE ${monthWhere}
//      GROUP BY t.transacted_date ORDER BY date`,
//     params
//   );

//   const busiestHourQ = await pool.query(
//     `SELECT t.transacted_hour AS hour, COUNT(*)::int AS count
//      FROM transactions t WHERE ${monthWhere}
//      GROUP BY t.transacted_hour ORDER BY count DESC, hour ASC LIMIT 1`,
//     params
//   );

//   const busiestDay = trend.rows.reduce(
//     (max, d) => (d.count > (max?.count ?? -1) ? d : max),
//     null as null | { date: string; count: number }
//   );

//   return {
//     year, month,
//     total_in: tt.total_in, total_out: tt.total_out, net: tt.total_in - tt.total_out,
//     transaction_count: tt.transaction_count,
//     busiest_day: busiestDay ? busiestDay.date : null,
//     busiest_hour: busiestHourQ.rows[0]?.hour ?? null,
//     by_category: cats.rows.map((c) => ({
//       category_id: c.category_id,
//       name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
//       amount: c.amount, count: c.count,
//     })),
//     daily_trend: trend.rows.map((d) => ({ date: d.date, total_in: d.total_in, total_out: d.total_out, count: d.count })),
//   };
// }