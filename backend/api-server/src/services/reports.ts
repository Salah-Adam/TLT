import { pool } from "../db";
import { Lang, t } from "../lib/messages";
import { getUserDek, decryptField } from "../encryption";
import { Scope, scopeFilters } from "./analytics";

export type Period = "daily" | "weekly" | "monthly";

interface Win { start: string; end: string; prevStart: string; prevEnd: string; }

const pctChange = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

// Resolve the [start,end] window (+ equal previous window) for a period, in EAT.
async function resolveWindow(period: Period, a: { date?: string; start?: string; year?: number; month?: number }): Promise<Win> {
  if (period === "daily") {
    const r = (await pool.query(
      `WITH x AS (SELECT COALESCE($1::date, (now() AT TIME ZONE 'Africa/Mogadishu')::date) AS d)
       SELECT d::text AS start, d::text AS "end", (d-1)::text AS prev_start, (d-1)::text AS prev_end FROM x`,
      [a.date ?? null]
    )).rows[0];
    return { start: r.start, end: r.end, prevStart: r.prev_start, prevEnd: r.prev_end };
  }
  if (period === "weekly") {
    const r = (await pool.query(
      `WITH x AS (SELECT COALESCE($1::date, (now() AT TIME ZONE 'Africa/Mogadishu')::date - 6) AS s)
       SELECT s::text AS start, (s+6)::text AS "end", (s-7)::text AS prev_start, (s-1)::text AS prev_end FROM x`,
      [a.start ?? null]
    )).rows[0];
    return { start: r.start, end: r.end, prevStart: r.prev_start, prevEnd: r.prev_end };
  }
  const r = (await pool.query(
    `WITH x AS (SELECT make_date(
        COALESCE($1::int, EXTRACT(YEAR  FROM (now() AT TIME ZONE 'Africa/Mogadishu')::date)::int),
        COALESCE($2::int, EXTRACT(MONTH FROM (now() AT TIME ZONE 'Africa/Mogadishu')::date)::int), 1) AS s)
     SELECT s::text AS start,
            ((s + INTERVAL '1 month' - INTERVAL '1 day')::date)::text AS "end",
            ((s - INTERVAL '1 month')::date)::text AS prev_start,
            ((s - INTERVAL '1 day')::date)::text AS prev_end
     FROM x`,
    [a.year ?? null, a.month ?? null]
  )).rows[0];
  return { start: r.start, end: r.end, prevStart: r.prev_start, prevEnd: r.prev_end };
}

// Build "user + date range + scope" WHERE, appending params in order.
function rangeWhere(params: any[], userId: string, start: string, end: string, scope: Scope): string {
  params.push(userId, start, end);
  return `t.user_id = $1 AND t.transacted_date BETWEEN $2 AND $3 ${scopeFilters(scope, params)}`;
}

async function loadDek(userId: string): Promise<Buffer | null> {
  try { return await getUserDek(userId); } catch { return null; }
}

function decodeCp(row: any, dek: Buffer | null) {
  let name: string | null = null, number: string | null = null, available = true;
  const hasCipher = !!(row.name_enc || row.phone_enc);
  if (hasCipher && !dek) available = false;
  else if (hasCipher) {
    try {
      if (row.name_enc)  name = decryptField(row.name_enc, dek!);
      if (row.phone_enc) number = decryptField(row.phone_enc, dek!);
    } catch { name = null; number = null; available = false; }
  }
  return { counterparty_name: name, counterparty_number: number, counterparty_available: available };
}

async function totals(userId: string, start: string, end: string, scope: Scope) {
  const p: any[] = [];
  const where = rangeWhere(p, userId, start, end, scope);
  const r = (await pool.query(
    `SELECT COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
            COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out,
            COUNT(*)::int AS transaction_count
     FROM transactions t WHERE ${where}`, p
  )).rows[0];
  return { total_in: r.total_in, total_out: r.total_out, net: r.total_in - r.total_out, transaction_count: r.transaction_count };
}

async function categoriesRaw(userId: string, start: string, end: string, scope: Scope) {
  const p: any[] = [];
  const where = rangeWhere(p, userId, start, end, scope);
  return (await pool.query(
    `SELECT t.category_id, c.name_en, c.name_so, SUM(t.amount)::float AS amount, COUNT(*)::int AS count
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where} AND t.direction='out'
     GROUP BY t.category_id, c.name_en, c.name_so ORDER BY amount DESC`, p
  )).rows;
}

async function topCounterparties(userId: string, start: string, end: string, scope: Scope, dek: Buffer | null) {
  const p: any[] = [];
  const where = rangeWhere(p, userId, start, end, scope);
  const rows = (await pool.query(
    `SELECT counterparty_phone_hash AS hash, direction,
            (array_agg(counterparty_name_enc))[1]  AS name_enc,
            (array_agg(counterparty_phone_enc))[1] AS phone_enc,
            SUM(amount)::float AS total, COUNT(*)::int AS count
     FROM transactions t
     WHERE ${where} AND counterparty_phone_hash IS NOT NULL
     GROUP BY counterparty_phone_hash, direction`, p
  )).rows;
  const top = (dir: string) =>
    rows.filter((r) => r.direction === dir).sort((a, b) => b.total - a.total).slice(0, 5)
        .map((r) => ({ ...decodeCp(r, dek), total: r.total, count: r.count }));
  return { top_recipients: top("out"), top_senders: top("in") };
}

async function largest(userId: string, start: string, end: string, scope: Scope, dek: Buffer | null) {
  const p: any[] = [];
  const where = rangeWhere(p, userId, start, end, scope);
  const rows = (await pool.query(
    `SELECT t.id, t.amount::float AS amount, t.direction, t.type, t.transacted_at,
            t.counterparty_name_enc AS name_enc, t.counterparty_phone_enc AS phone_enc
     FROM transactions t WHERE ${where}
     ORDER BY t.amount DESC LIMIT 5`, p
  )).rows;
  return rows.map((r) => ({ id: r.id, amount: r.amount, direction: r.direction, type: r.type, transacted_at: r.transacted_at, ...decodeCp(r, dek) }));
}

async function busiest(userId: string, start: string, end: string, scope: Scope) {
  const p1: any[] = []; const w1 = rangeWhere(p1, userId, start, end, scope);
  const day = (await pool.query(
    `SELECT t.transacted_date::text AS day, COUNT(*)::int AS count FROM transactions t WHERE ${w1}
     GROUP BY t.transacted_date ORDER BY count DESC, day ASC LIMIT 1`, p1
  )).rows[0];
  const p2: any[] = []; const w2 = rangeWhere(p2, userId, start, end, scope);
  const hour = (await pool.query(
    `SELECT t.transacted_hour AS hour, COUNT(*)::int AS count FROM transactions t WHERE ${w2}
     GROUP BY t.transacted_hour ORDER BY count DESC, hour ASC LIMIT 1`, p2
  )).rows[0];
  return { busiest_day: day?.day ?? null, busiest_day_count: day?.count ?? 0, busiest_hour: hour?.hour ?? null };
}

// Last N same-length periods of spending (for the trend chart + trend insight).
async function trendSeries(userId: string, period: Period, win: Win, scope: Scope) {
  const p: any[] = [];
  let sql: string;
  if (period === "daily") {
    p.push(userId, win.end); const sc = scopeFilters(scope, p);
    sql = `SELECT g::date::text AS bucket, COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS spent
           FROM generate_series($2::date - 6, $2::date, INTERVAL '1 day') g
           LEFT JOIN transactions t ON t.user_id=$1 AND t.transacted_date = g::date ${sc}
           GROUP BY g ORDER BY g`;
  } else if (period === "weekly") {
    p.push(userId, win.start); const sc = scopeFilters(scope, p);
    sql = `SELECT g::date::text AS bucket, COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS spent
           FROM generate_series($2::date - INTERVAL '5 weeks', $2::date, INTERVAL '1 week') g
           LEFT JOIN transactions t ON t.user_id=$1 AND t.transacted_date BETWEEN g::date AND (g::date + 6) ${sc}
           GROUP BY g ORDER BY g`;
  } else {
    p.push(userId, win.start); const sc = scopeFilters(scope, p);
    sql = `SELECT to_char(g,'YYYY-MM') AS bucket, COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS spent
           FROM generate_series($2::date - INTERVAL '5 months', $2::date, INTERVAL '1 month') g
           LEFT JOIN transactions t ON t.user_id=$1 AND date_trunc('month',t.transacted_date)=date_trunc('month',g) ${sc}
           GROUP BY g ORDER BY g`;
  }
  return (await pool.query(sql, p)).rows as { bucket: string; spent: number }[];
}

function buildInsights(
  lang: Lang, period: Period, tot: any, prev: any, by_category: any[],
  tcp: { top_senders: any[]; top_recipients: any[] }, lrg: any[], bz: any, trend: { spent: number }[], currency: string
): string[] {
  const out: string[] = [];
  const fmt = (n: number) => n.toFixed(2);
  const nameOf = (cp: any) => (cp.counterparty_available ? (cp.counterparty_name || cp.counterparty_number || t("CONTACT_UNKNOWN", lang)) : t("CONTACT_UNKNOWN", lang));

  if (tot.transaction_count === 0) { out.push(t("INSIGHT_NO_DATA", lang)); return out; }

  // Net result
  if (tot.net >= 0) out.push(t("INSIGHT_NET_SAVED", lang, { amount: fmt(tot.net), currency }));
  else out.push(t("INSIGHT_NET_DEFICIT", lang, { amount: fmt(Math.abs(tot.net)), currency }));

  // vs previous period
  if (prev.total_out > 0) {
    const ch = pctChange(tot.total_out, prev.total_out);
    if (ch !== null && ch > 0) out.push(t("INSIGHT_SPENDING_UP", lang, { pct: Math.abs(ch) }));
    else if (ch !== null && ch < 0) out.push(t("INSIGHT_SPENDING_DOWN", lang, { pct: Math.abs(ch) }));
  }

  // Trend over the last few periods
  const vals = trend.map((s) => s.spent);
  if (vals.length >= 3) {
    const last = vals[vals.length - 1];
    const earlier = vals.slice(0, -1);
    const avg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (avg > 0 && last > avg * 1.15) out.push(t("INSIGHT_TREND_UP", lang));
    else if (avg > 0 && last < avg * 0.85) out.push(t("INSIGHT_TREND_DOWN", lang));
  }

  // Top up-to-5 spending categories
  for (const c of by_category.slice(0, 5)) {
    if (c.amount > 0) out.push(t("INSIGHT_TOP_SPEND", lang, { amount: fmt(c.amount), currency, category: c.name, pct: c.percent_of_spending }));
  }

  // Top up-to-5 senders / recipients
  for (const s of tcp.top_senders)    out.push(t("INSIGHT_TOP_SENDER",    lang, { name: nameOf(s), amount: fmt(s.total), currency, count: s.count }));
  for (const r of tcp.top_recipients) out.push(t("INSIGHT_TOP_RECIPIENT", lang, { name: nameOf(r), amount: fmt(r.total), currency, count: r.count }));

  // Top up-to-5 largest transactions
  for (const l of lrg) {
    const code = l.direction === "in" ? "INSIGHT_LARGEST_IN" : "INSIGHT_LARGEST_OUT";
    out.push(t(code, lang, { amount: fmt(l.amount), currency, name: nameOf(l) }));
  }

  // Busiest day (weekly/monthly)
  if (period !== "daily" && bz.busiest_day) {
    out.push(t("INSIGHT_BUSIEST_DAY", lang, { day: bz.busiest_day, count: bz.busiest_day_count }));
  }

  return out;
}

export async function getReport(
  userId: string,
  lang: Lang,
  period: Period,
  anchor: { date?: string; start?: string; year?: number; month?: number },
  scope: Scope = {}
) {
  const win = await resolveWindow(period, anchor);
  const dek = await loadDek(userId);

  const tot  = await totals(userId, win.start, win.end, scope);
  const prev = await totals(userId, win.prevStart, win.prevEnd, scope);
  const cats = await categoriesRaw(userId, win.start, win.end, scope);
  const tcp  = await topCounterparties(userId, win.start, win.end, scope, dek);
  const lrg  = await largest(userId, win.start, win.end, scope, dek);
  const bz   = await busiest(userId, win.start, win.end, scope);
  const trend = await trendSeries(userId, period, win, scope);

  const currency = "USD";
  const by_category = cats.map((c) => ({
    category_id: c.category_id,
    name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
    amount: c.amount, count: c.count,
    percent_of_spending: tot.total_out > 0 ? Math.round((c.amount / tot.total_out) * 1000) / 10 : 0,
  }));

  const insights = buildInsights(lang, period, tot, prev, by_category, tcp, lrg, bz, trend, currency);

  return {
    period, start: win.start, end: win.end, currency,
    total_in: tot.total_in, total_out: tot.total_out, net: tot.net, transaction_count: tot.transaction_count,
    vs_last_period: { in_change_percent: pctChange(tot.total_in, prev.total_in), out_change_percent: pctChange(tot.total_out, prev.total_out) },
    trend,
    by_category,
    top_senders: tcp.top_senders,
    top_recipients: tcp.top_recipients,
    largest_transactions: lrg,
    busiest_day: bz.busiest_day, busiest_hour: bz.busiest_hour,
    insights,
  };
}

// import { pool } from "../db";
// import { Lang, t } from "../lib/messages";
// import { getUserDek, decryptField } from "../encryption";
// import * as analytics from "./analytics";
// import { Scope, scopeFilters } from "./analytics";

// // FEED-ONLY: counts all transactions (matches analytics + summaries). No is_deleted filter.

// const pct = (cur: number, prev: number): number | null =>
//   prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

// const prevMonth = (year: number, month: number) =>
//   month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

// async function monthTotals(userId: string, year: number, month: number, scope: Scope) {
//   const params: any[] = [userId, year, month];
//   const f = scopeFilters(scope, params);
//   const r = (await pool.query(
//     `SELECT COALESCE(SUM(amount) FILTER (WHERE direction='in'),0)::float  AS total_in,
//             COALESCE(SUM(amount) FILTER (WHERE direction='out'),0)::float AS total_out
//      FROM transactions t
//      WHERE t.user_id=$1 AND EXTRACT(YEAR FROM t.transacted_date)=$2 AND EXTRACT(MONTH FROM t.transacted_date)=$3 ${f}`,
//     params
//   )).rows[0];
//   return { total_in: r.total_in, total_out: r.total_out, net: r.total_in - r.total_out };
// }

// async function topCounterparties(userId: string, year: number, month: number, scope: Scope) {
//   const params: any[] = [userId, year, month];
//   const f = scopeFilters(scope, params);
//   // Group by the blind-index hash (no decryption needed to group), keep one sample ciphertext per party.
//   const rows = (await pool.query(
//     `SELECT counterparty_phone_hash AS hash, direction,
//             (array_agg(counterparty_name_enc))[1]  AS name_enc,
//             (array_agg(counterparty_phone_enc))[1] AS phone_enc,
//             SUM(amount)::float AS total, COUNT(*)::int AS count
//      FROM transactions t
//      WHERE t.user_id=$1 AND EXTRACT(YEAR FROM t.transacted_date)=$2 AND EXTRACT(MONTH FROM t.transacted_date)=$3
//        AND t.counterparty_phone_hash IS NOT NULL ${f}
//      GROUP BY counterparty_phone_hash, direction`,
//     params
//   )).rows;

//   let dek: Buffer | null = null;
//   try { dek = await getUserDek(userId); } catch { dek = null; }

//   const decode = (row: any) => {
//     let name: string | null = null, number: string | null = null, available = true;
//     const hasCipher = !!(row.name_enc || row.phone_enc);
//     if (hasCipher && !dek) available = false;
//     else if (hasCipher) {
//       try {
//         if (row.name_enc)  name = decryptField(row.name_enc, dek!);
//         if (row.phone_enc) number = decryptField(row.phone_enc, dek!);
//       } catch { name = null; number = null; available = false; }
//     }
//     return { counterparty_name: name, counterparty_number: number, counterparty_available: available, total: row.total, count: row.count };
//   };

//   const top = (dir: string) =>
//     rows.filter((r) => r.direction === dir).sort((a, b) => b.total - a.total).slice(0, 5).map(decode);

//   return { top_recipients: top("out"), top_senders: top("in") };
// }

// function buildInsights(lang: Lang, core: any, prev: { total_out: number }, byCategory: any[], currency: string): string[] {
//   const out: string[] = [];
//   const fmt = (n: number) => n.toFixed(2);

//   if (core.transaction_count === 0) { out.push(t("INSIGHT_NO_DATA", lang)); return out; }

//   if (core.net >= 0) out.push(t("INSIGHT_NET_SAVED", lang, { amount: fmt(core.net), currency }));
//   else out.push(t("INSIGHT_NET_DEFICIT", lang, { amount: fmt(Math.abs(core.net)), currency }));

//   if (byCategory.length > 0 && core.total_out > 0) {
//     const topc = byCategory[0];
//     out.push(t("INSIGHT_TOP_CATEGORY", lang, { category: topc.name, amount: fmt(topc.amount), currency }));
//   }

//   if (prev.total_out > 0) {
//     const change = pct(core.total_out, prev.total_out);
//     if (change !== null && change > 0) out.push(t("INSIGHT_SPENDING_UP", lang, { pct: Math.abs(change) }));
//     else if (change !== null && change < 0) out.push(t("INSIGHT_SPENDING_DOWN", lang, { pct: Math.abs(change) }));
//   }

//   return out;
// }

// export async function getMonthlyReport(userId: string, lang: Lang, year?: number, month?: number, scope: Scope = {}) {
//   // Reuse analytics for totals / by_category / daily_trend / busiest.
//   const core = await analytics.getMonthly(userId, lang, year, month, scope);
//   const y = core.year, m = core.month;

//   const prev = prevMonth(y!, m!);
//   const prevTotals = await monthTotals(userId, prev.year, prev.month, scope);

//   const currency = "USD";
//   const by_category = core.by_category.map((c: any) => ({
//     ...c,
//     percent_of_spending: core.total_out > 0 ? Math.round((c.amount / core.total_out) * 1000) / 10 : 0,
//   }));

//   const { top_recipients, top_senders } = await topCounterparties(userId, y!, m!, scope);
//   const insights = buildInsights(lang, core, prevTotals, by_category, currency);

//   return {
//     year: y, month: m, currency,
//     total_in: core.total_in, total_out: core.total_out, net: core.net, transaction_count: core.transaction_count,
//     vs_last_month: {
//       in_change_percent: pct(core.total_in, prevTotals.total_in),
//       out_change_percent: pct(core.total_out, prevTotals.total_out),
//     },
//     busiest_day: core.busiest_day, busiest_hour: core.busiest_hour,
//     by_category,
//     daily_trend: core.daily_trend,
//     top_recipients, top_senders,
//     insights,
//   };
// }