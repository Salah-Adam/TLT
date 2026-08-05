import { pool } from "../db";
import { Lang, t } from "../lib/messages";
import { getUserDek, decryptField } from "../encryption";
// import { Scope, scopeFilters } from "./analytics";
import { listAlerts, spendInRange } from "./spending-alerts";
import { contactTotalsInWindow } from "./tracked-contacts";

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

// user + date range (+ optional SIM) for TRANSACTION queries (t.*).
function txWhere(params: any[], userId: string, start: string, end: string, phoneIds?: string[]): string {
  params.push(userId, start, end);
  let w = `t.user_id = $1 AND t.transacted_date BETWEEN $2 AND $3`;
  if (phoneIds?.length) { params.push(phoneIds); w += ` AND t.phone_number_id = ANY($${params.length}::uuid[])`; }
  return w;
}
// same, for daily-SUMMARY queries (s.*).
function sumWhere(params: any[], userId: string, start: string, end: string, phoneIds?: string[]): string {
  params.push(userId, start, end);
  let w = `s.user_id = $1 AND s.summary_date BETWEEN $2 AND $3`;
  if (phoneIds?.length) { params.push(phoneIds); w += ` AND s.phone_number_id = ANY($${params.length}::uuid[])`; }
  return w;
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

async function totals(userId: string, start: string, end: string, phoneIds?: string[]) {
  const p: any[] = []; const w = sumWhere(p, userId, start, end, phoneIds);
  const r = (await pool.query(
    `SELECT COALESCE(SUM(s.total_in),0)::float AS total_in, COALESCE(SUM(s.total_out),0)::float AS total_out,
            COALESCE(SUM(s.transaction_count),0)::int AS transaction_count
     FROM daily_summaries s WHERE ${w}`, p
  )).rows[0];
  return { total_in: r.total_in, total_out: r.total_out, net: r.total_in - r.total_out, transaction_count: r.transaction_count };
}

async function categoriesRaw(userId: string, start: string, end: string, phoneIds?: string[]) {
  const p: any[] = []; const w = sumWhere(p, userId, start, end, phoneIds);
  const rows = (await pool.query(`SELECT s.category_breakdown FROM daily_summaries s WHERE ${w}`, p)).rows;
  const merged: Record<string, { out: number; countOut: number }> = {};
  for (const r of rows) for (const [k, v] of Object.entries((r.category_breakdown ?? {}) as Record<string, any>)) {
    let b = merged[k]; if (!b) { b = { out: 0, countOut: 0 }; merged[k] = b; }
    b.out += Number(v.out ?? 0); b.countOut += Number(v.countOut ?? 0);
  }
  const ids = Object.keys(merged).filter((k) => k !== "uncategorized" && merged[k].countOut > 0);
  const names: Record<string, { en: string; so: string }> = {};
  if (ids.length) {
    const nr = await pool.query(`SELECT id, name_en, name_so FROM categories WHERE id = ANY($1::uuid[])`, [ids]);
    for (const x of nr.rows) names[x.id] = { en: x.name_en, so: x.name_so };
  }
  const out: { category_id: string | null; name_en: string | null; name_so: string | null; amount: number; count: number }[] = [];
  for (const [k, b] of Object.entries(merged)) {
    if (b.countOut <= 0) continue;
    const isUncat = k === "uncategorized";
    out.push({ category_id: isUncat ? null : k, name_en: isUncat ? null : (names[k]?.en ?? null), name_so: isUncat ? null : (names[k]?.so ?? null), amount: b.out, count: b.countOut });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

// async function topCounterparties(userId: string, start: string, end: string, phoneIds: string[] | undefined, dek: Buffer | null) {
//   const p: any[] = [];
//   const where = txWhere(p, userId, start, end, phoneIds);   // ← was rangeWhere(..., scope)
//   // …rest unchanged…
//   const rows = (await pool.query(
//     `SELECT counterparty_phone_hash AS hash, direction,
//             (array_agg(counterparty_name_enc))[1]  AS name_enc,
//             (array_agg(counterparty_phone_enc))[1] AS phone_enc,
//             SUM(amount)::float AS total, COUNT(*)::int AS count
//      FROM transactions t
//      WHERE ${where} AND counterparty_phone_hash IS NOT NULL
//      GROUP BY counterparty_phone_hash, direction`, p
//   )).rows;
//   const top = (dir: string) =>
//     rows.filter((r) => r.direction === dir).sort((a, b) => b.total - a.total).slice(0, 5)
//         .map((r) => ({ ...decodeCp(r, dek), total: r.total, count: r.count }));
//   return { top_recipients: top("out"), top_senders: top("in") };
// }
async function topCounterparties(userId: string, start: string, end: string, phoneIds: string[] | undefined, dek: Buffer | null) {
  const p: any[] = [];
  const where = txWhere(p, userId, start, end, phoneIds);
  const rows = (await pool.query(
    `SELECT counterparty_phone_hash AS hash, direction,
            (array_agg(counterparty_name_enc))[1]  AS name_enc,
            (array_agg(counterparty_phone_enc))[1] AS phone_enc,
            SUM(amount)::float AS total, COUNT(*)::int AS count
     FROM transactions t
     WHERE ${where} AND counterparty_phone_hash IS NOT NULL
     GROUP BY counterparty_phone_hash, direction`, p
  )).rows;
  const CAP = 100;
  const build = (dir: string) => {
    const sorted = rows.filter((r) => r.direction === dir).sort((a, b) => b.total - a.total);
    return { list: sorted.slice(0, CAP).map((r) => ({ ...decodeCp(r, dek), total: r.total, count: r.count })), truncated: sorted.length > CAP };
  };
  const rec = build("out"), snd = build("in");
  return { top_recipients: rec.list, recipients_truncated: rec.truncated, top_senders: snd.list, senders_truncated: snd.truncated };
}


async function largest(userId: string, start: string, end: string, phoneIds: string[] | undefined, dek: Buffer | null) {
  const p: any[] = [];
  const where = txWhere(p, userId, start, end, phoneIds);   // ← was rangeWhere(..., scope)
  // …rest unchanged…
  const rows = (await pool.query(
    `SELECT t.id, t.amount::float AS amount, t.direction, t.type, t.transacted_at,
            t.counterparty_name_enc AS name_enc, t.counterparty_phone_enc AS phone_enc
     FROM transactions t WHERE ${where}
     ORDER BY t.amount DESC LIMIT 5`, p
  )).rows;
  return rows.map((r) => ({ id: r.id, amount: r.amount, direction: r.direction, type: r.type, transacted_at: r.transacted_at, ...decodeCp(r, dek) }));
}

async function busiest(userId: string, start: string, end: string, phoneIds?: string[]) {
  const p: any[] = []; const w = sumWhere(p, userId, start, end, phoneIds);
  const rows = (await pool.query(
    `SELECT s.summary_date::text AS date, s.transaction_count, s.hourly_breakdown FROM daily_summaries s WHERE ${w}`, p
  )).rows;
  const perDay: Record<string, number> = {}, hourly: Record<string, number> = {};
  for (const r of rows) {
    perDay[r.date] = (perDay[r.date] ?? 0) + r.transaction_count;
    for (const [h, v] of Object.entries((r.hourly_breakdown ?? {}) as Record<string, any>))
      hourly[h] = (hourly[h] ?? 0) + Number(v.countIn ?? 0) + Number(v.countOut ?? 0);
  }
  let bd: string | null = null, bdc = -1;
  for (const [d, c] of Object.entries(perDay).sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (c > bdc) { bdc = c; bd = d; }
  let bh: number | null = null, bhc = -1;
  for (const [h, c] of Object.entries(hourly).sort((a, b) => Number(a[0]) - Number(b[0]))) if (c > bhc) { bhc = c; bh = Number(h); }
  return { busiest_day: bd, busiest_day_count: bd ? bdc : 0, busiest_hour: bh };
}

// async function trendSeries(userId: string, period: Period, win: Win, phoneIds?: string[]) {
//   const p: any[] = []; let sql: string; let pf = "";
//   if (period === "daily") {
//     p.push(userId, win.end);
//     if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
//     sql = `SELECT g::date::text AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent
//            FROM generate_series($2::date - 6, $2::date, INTERVAL '1 day') g
//            LEFT JOIN daily_summaries s ON s.user_id=$1 AND s.summary_date = g::date ${pf}
//            GROUP BY g ORDER BY g`;
//   } else if (period === "weekly") {
//     p.push(userId, win.start);
//     if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
//     sql = `SELECT g::date::text AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent
//            FROM generate_series($2::date - INTERVAL '5 weeks', $2::date, INTERVAL '1 week') g
//            LEFT JOIN daily_summaries s ON s.user_id=$1 AND s.summary_date BETWEEN g::date AND (g::date + 6) ${pf}
//            GROUP BY g ORDER BY g`;
//   } else {
//     p.push(userId, win.start);
//     if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
//     sql = `SELECT to_char(g,'YYYY-MM') AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent
//            FROM generate_series($2::date - INTERVAL '5 months', $2::date, INTERVAL '1 month') g
//            LEFT JOIN monthly_summaries s ON s.user_id=$1 AND s.summary_year=EXTRACT(YEAR FROM g)::int AND s.summary_month=EXTRACT(MONTH FROM g)::int ${pf}
//            GROUP BY g ORDER BY g`;
//   }
//   return (await pool.query(sql, p)).rows as { bucket: string; spent: number }[];
// }

async function trendSeries(userId: string, period: Period, win: Win, phoneIds?: string[]) {
  const p: any[] = []; let sql: string; let pf = "";
  if (period === "daily") {
    p.push(userId, win.end);
    if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
    sql = `SELECT g::date::text AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent, COALESCE(SUM(s.total_in),0)::float AS received
           FROM generate_series($2::date - 6, $2::date, INTERVAL '1 day') g
           LEFT JOIN daily_summaries s ON s.user_id=$1 AND s.summary_date = g::date ${pf}
           GROUP BY g ORDER BY g`;
  } else if (period === "weekly") {
    p.push(userId, win.start);
    if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
    sql = `SELECT g::date::text AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent, COALESCE(SUM(s.total_in),0)::float AS received
           FROM generate_series($2::date - INTERVAL '5 weeks', $2::date, INTERVAL '1 week') g
           LEFT JOIN daily_summaries s ON s.user_id=$1 AND s.summary_date BETWEEN g::date AND (g::date + 6) ${pf}
           GROUP BY g ORDER BY g`;
  } else {
    p.push(userId, win.start);
    if (phoneIds?.length) { p.push(phoneIds); pf = `AND s.phone_number_id = ANY($${p.length}::uuid[])`; }
    sql = `SELECT to_char(g,'YYYY-MM') AS bucket, COALESCE(SUM(s.total_out),0)::float AS spent, COALESCE(SUM(s.total_in),0)::float AS received
           FROM generate_series($2::date - INTERVAL '5 months', $2::date, INTERVAL '1 month') g
           LEFT JOIN monthly_summaries s ON s.user_id=$1 AND s.summary_year=EXTRACT(YEAR FROM g)::int AND s.summary_month=EXTRACT(MONTH FROM g)::int ${pf}
           GROUP BY g ORDER BY g`;
  }
  return (await pool.query(sql, p)).rows as { bucket: string; spent: number; received: number }[];
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
  for (const s of tcp.top_senders.slice(0, 5))    out.push(t("INSIGHT_TOP_SENDER",    lang, { name: nameOf(s), amount: fmt(s.total), currency, count: s.count }));
  for (const r of tcp.top_recipients.slice(0, 5)) out.push(t("INSIGHT_TOP_RECIPIENT", lang, { name: nameOf(r), amount: fmt(r.total), currency, count: r.count }));

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
  userId: string, lang: Lang, period: Period,
  anchor: { date?: string; start?: string; year?: number; month?: number },
  phoneNumberIds?: string[]
) {
  const win = await resolveWindow(period, anchor);
  const dek = await loadDek(userId);

  const tot   = await totals(userId, win.start, win.end, phoneNumberIds);
  const prev  = await totals(userId, win.prevStart, win.prevEnd, phoneNumberIds);
  const cats  = await categoriesRaw(userId, win.start, win.end, phoneNumberIds);
  const tcp   = await topCounterparties(userId, win.start, win.end, phoneNumberIds, dek);
  const lrg   = await largest(userId, win.start, win.end, phoneNumberIds, dek);
  const bz    = await busiest(userId, win.start, win.end, phoneNumberIds);
  const trend = await trendSeries(userId, period, win, phoneNumberIds);
  
  const currency = "USD";
  const by_category = cats.map((c) => ({
    category_id: c.category_id,
    name: c.category_id ? (lang === "so" ? c.name_so : c.name_en) : t("UNCATEGORIZED", lang),
    amount: c.amount, count: c.count,
    percent_of_spending: tot.total_out > 0 ? Math.round((c.amount / tot.total_out) * 1000) / 10 : 0,
  }));

  const insights = buildInsights(lang, period, tot, prev, by_category, tcp, lrg, bz, trend, currency);

  // return {
  //   period, start: win.start, end: win.end, currency,
  //   total_in: tot.total_in, total_out: tot.total_out, net: tot.net, transaction_count: tot.transaction_count,
  //   // vs_last_period: { in_change_percent: pctChange(tot.total_in, prev.total_in), out_change_percent: pctChange(tot.total_out, prev.total_out) },
  //   vs_last_period: {
  //     in_change_percent: pctChange(tot.total_in, prev.total_in),
  //     out_change_percent: pctChange(tot.total_out, prev.total_out),
  //     prev_out: prev.total_out,          // ← add
  //   },

  //   trend,
  //   by_category,
  //   top_senders: tcp.top_senders,
  //   top_recipients: tcp.top_recipients,
  //   largest_transactions: lrg,
  //   busiest_day: bz.busiest_day, busiest_hour: bz.busiest_hour,
  //   insights,
  // };


  return {
    period, start: win.start, end: win.end, currency,
    total_in: tot.total_in, total_out: tot.total_out, net: tot.net, transaction_count: tot.transaction_count,
    vs_last_period: { in_change_percent: pctChange(tot.total_in, prev.total_in), out_change_percent: pctChange(tot.total_out, prev.total_out), prev_out: prev.total_out },
    trend,
    by_category,
    top_senders: tcp.top_senders,
    top_recipients: tcp.top_recipients,
    recipients_truncated: tcp.recipients_truncated,   // ← add
    senders_truncated: tcp.senders_truncated,          // ← add
    largest_transactions: lrg,
    busiest_day: bz.busiest_day, busiest_hour: bz.busiest_hour,
    insights,
  };
}

export async function getReportBudgets(userId: string, lang: Lang, period: Period, anchor: any) {
  if (period === "daily") return [];               // budgets are weekly/monthly only
  const win = await resolveWindow(period, anchor);
  const all = await listAlerts(userId, lang);
  const matching = all.filter((a: any) => a.period === period && a.is_active);
  const out: any[] = [];
  for (const a of matching) {
    const s = await spendInRange(userId, a.category.id, win.start, win.end, a.phone_number_id);
    out.push({ ...a, window_spent: s.spent, window_count: s.count });
  }
  out.sort((x, y) => (y.window_spent / (y.limit_amount || 1)) - (x.window_spent / (x.limit_amount || 1)));
  return out;
}

export async function getReportTracked(userId: string, _lang: Lang, period: Period, anchor: any) {
  if (period === "daily") return [];
  const win = await resolveWindow(period, anchor);
  return contactTotalsInWindow(userId, win.start, win.end);
}