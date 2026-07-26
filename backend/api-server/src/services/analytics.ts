import { pool } from "../db";
import { Lang, t } from "../lib/messages";

/**
 * Analytics now reads from the pre-computed daily/monthly SUMMARY tables instead of scanning
 * `transactions` on demand (option A). The summaries are recomputed from `transactions` on every
 * insert/recategorize (worker + edit-sync) and include soft-deleted amounts, so these numbers are
 * identical to the old on-demand ones — feed-only-hide preserved. Scope is phone-number only:
 * summaries aren't broken down by provider/type, so those analytics filters were dropped.
 */

export interface Scope { phoneNumberIds?: string[]; provider?: string; type?: string; categoryId?: string; }
export function scopeFilters(s: Scope, params: any[]): string {
  const parts: string[] = [];
  if (s.phoneNumberIds?.length) { params.push(s.phoneNumberIds); parts.push(`AND t.phone_number_id = ANY($${params.length}::uuid[])`); }
  if (s.provider)   { params.push(s.provider);   parts.push(`AND t.provider = $${params.length}`); }
  if (s.type)       { params.push(s.type);       parts.push(`AND t.type = $${params.length}`); }
  if (s.categoryId) { params.push(s.categoryId); parts.push(`AND t.category_id = $${params.length}`); }
  return parts.join(" ");
}

const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ── breakdown merging (a period spans one summary row PER SIM; sum them) ──
type Bucket = { in: number; out: number; countIn: number; countOut: number };
function mergeBuckets(target: Record<string, Bucket>, src: Record<string, any> | null | undefined): void {
  if (!src) return;
  for (const [k, v] of Object.entries(src)) {
    let b = target[k];
    if (!b) { b = { in: 0, out: 0, countIn: 0, countOut: 0 }; target[k] = b; }
    b.in += Number(v.in ?? 0); b.out += Number(v.out ?? 0);
    b.countIn += Number(v.countIn ?? 0); b.countOut += Number(v.countOut ?? 0);
  }
}
// by_category = OUT spending per category (matches the old `WHERE direction='out'`): amount=out, count=countOut.
async function nameCategories(merged: Record<string, Bucket>, lang: Lang) {
  const ids = Object.keys(merged).filter((k) => k !== "uncategorized" && merged[k].countOut > 0);
  const names: Record<string, { en: string; so: string }> = {};
  if (ids.length) {
    const r = await pool.query(`SELECT id, name_en, name_so FROM categories WHERE id = ANY($1::uuid[])`, [ids]);
    for (const x of r.rows) names[x.id] = { en: x.name_en, so: x.name_so };
  }
  const out: { category_id: string | null; name: string; amount: number; count: number }[] = [];
  for (const [k, b] of Object.entries(merged)) {
    if (b.countOut <= 0) continue; // only categories with out-spending, like the old query
    const isUncat = k === "uncategorized";
    const name = isUncat ? t("UNCATEGORIZED", lang) : ((lang === "so" ? names[k]?.so : names[k]?.en) ?? t("UNCATEGORIZED", lang));
    out.push({ category_id: isUncat ? null : k, name, amount: b.out, count: b.countOut });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
function hoursFromBuckets(hourly: Record<string, Bucket>) {
  return Object.entries(hourly)
    .map(([h, b]) => ({ hour: Number(h), total_in: b.in, total_out: b.out, count: b.countIn + b.countOut }))
    .sort((a, b) => a.hour - b.hour);
}
// busiest hour = most transactions; ties broken by the lower hour (matches `ORDER BY count DESC, hour ASC`).
function busiestHourFromBuckets(hourly: Record<string, Bucket>): number | null {
  let hr: number | null = null, best = -1;
  for (const [h, b] of Object.entries(hourly)) {
    const c = b.countIn + b.countOut;
    if (c > best) { best = c; hr = Number(h); }
  }
  return hr;
}

// ── Dashboard ── today / rolling-7d week (+ vs prev week) / this-month, from DAILY summaries.
export async function getDashboard(userId: string, phoneNumberIds?: string[]) {
  const params: any[] = [userId];
  let pf = "";
  if (phoneNumberIds?.length) { params.push(phoneNumberIds); pf = `AND s.phone_number_id = ANY($${params.length}::uuid[])`; }

  const r = (await pool.query(
    `WITH b AS (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS today)
     SELECT
       COALESCE(SUM(s.total_in)  FILTER (WHERE s.summary_date = b.today),0)::float AS today_in,
       COALESCE(SUM(s.total_out) FILTER (WHERE s.summary_date = b.today),0)::float AS today_out,
       COALESCE(SUM(s.transaction_count) FILTER (WHERE s.summary_date = b.today),0)::int AS today_count,
       COALESCE(SUM(s.total_in)  FILTER (WHERE s.summary_date >  b.today - 7),0)::float AS week_in,
       COALESCE(SUM(s.total_out) FILTER (WHERE s.summary_date >  b.today - 7),0)::float AS week_out,
       COALESCE(SUM(s.transaction_count) FILTER (WHERE s.summary_date > b.today - 7),0)::int AS week_count,
       COALESCE(SUM(s.total_in)  FILTER (WHERE s.summary_date > b.today - 14 AND s.summary_date <= b.today - 7),0)::float AS pweek_in,
       COALESCE(SUM(s.total_out) FILTER (WHERE s.summary_date > b.today - 14 AND s.summary_date <= b.today - 7),0)::float AS pweek_out,
       COALESCE(SUM(s.total_in)  FILTER (WHERE date_trunc('month',s.summary_date)=date_trunc('month',b.today)),0)::float AS month_in,
       COALESCE(SUM(s.total_out) FILTER (WHERE date_trunc('month',s.summary_date)=date_trunc('month',b.today)),0)::float AS month_out,
       COALESCE(SUM(s.transaction_count) FILTER (WHERE date_trunc('month',s.summary_date)=date_trunc('month',b.today)),0)::int AS month_count
     FROM daily_summaries s, b
     WHERE s.user_id = $1 ${pf}`,
    params
  )).rows[0];

  // Estimated balance = each active SIM's most-recent day's closing balance.
  const bParams: any[] = [userId];
  let bpf = "";
  if (phoneNumberIds?.length) { bParams.push(phoneNumberIds); bpf = `AND s.phone_number_id = ANY($${bParams.length}::uuid[])`; }
  const balances = await pool.query(
    `SELECT DISTINCT ON (s.phone_number_id)
            s.phone_number_id, pn.number, pn.provider, s.closing_balance::float AS estimated_balance
     FROM daily_summaries s JOIN phone_numbers pn ON pn.id = s.phone_number_id
     WHERE s.user_id = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL ${bpf}
     ORDER BY s.phone_number_id, s.summary_date DESC`,
    bParams
  );

  return {
    today: { total_in: r.today_in, total_out: r.today_out, net: r.today_in - r.today_out, transaction_count: r.today_count },
    this_week: { total_in: r.week_in, total_out: r.week_out, net: r.week_in - r.week_out, transaction_count: r.week_count,
      vs_last_week: { in_change_percent: pct(r.week_in, r.pweek_in), out_change_percent: pct(r.week_out, r.pweek_out) } },
    this_month: { total_in: r.month_in, total_out: r.month_out, net: r.month_in - r.month_out, transaction_count: r.month_count },
    estimated_balances: balances.rows,
  };
}

// ── Daily ── one summary row per SIM; merge across the selected SIMs.
export async function getDaily(userId: string, lang: Lang, date?: string, phoneNumberIds?: string[]) {
  const day = date ?? (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;
  const params: any[] = [userId, day];
  let pf = "";
  if (phoneNumberIds?.length) { params.push(phoneNumberIds); pf = `AND phone_number_id = ANY($${params.length}::uuid[])`; }

  const rows = (await pool.query(
    `SELECT total_in, total_out, transaction_count, transaction_count_in, transaction_count_out,
            largest_transaction_in, largest_transaction_out, category_breakdown, hourly_breakdown
     FROM daily_summaries WHERE user_id=$1 AND summary_date=$2 ${pf}`,
    params
  )).rows;

  let total_in = 0, total_out = 0, transaction_count = 0, count_in = 0, count_out = 0;
  let largest_in: number | null = null, largest_out: number | null = null;
  const cat: Record<string, Bucket> = {}, hourly: Record<string, Bucket> = {};
  for (const s of rows) {
    total_in += Number(s.total_in); total_out += Number(s.total_out);
    transaction_count += s.transaction_count; count_in += s.transaction_count_in; count_out += s.transaction_count_out;
    if (s.largest_transaction_in  != null) largest_in  = Math.max(largest_in  ?? 0, Number(s.largest_transaction_in));
    if (s.largest_transaction_out != null) largest_out = Math.max(largest_out ?? 0, Number(s.largest_transaction_out));
    mergeBuckets(cat, s.category_breakdown); mergeBuckets(hourly, s.hourly_breakdown);
  }

  return {
    date: day, total_in, total_out, net: total_in - total_out,
    transaction_count, count_in, count_out, largest_in, largest_out,
    by_category: await nameCategories(cat, lang),
    by_hour: hoursFromBuckets(hourly),
  };
}

// ── Weekly (Sat–Fri) ── aggregate the 7 daily rows.
export async function getWeekly(userId: string, lang: Lang, start?: string, phoneNumberIds?: string[]) {
  const s = start ?? (await pool.query(
    `SELECT ((now() AT TIME ZONE 'Africa/Mogadishu')::date
             - ((EXTRACT(DOW FROM (now() AT TIME ZONE 'Africa/Mogadishu')::date)::int + 1) % 7))::text AS d`)).rows[0].d;
  const params: any[] = [userId, s];
  let pf = "";
  if (phoneNumberIds?.length) { params.push(phoneNumberIds); pf = `AND phone_number_id = ANY($${params.length}::uuid[])`; }

  const rows = (await pool.query(
    `SELECT summary_date::text AS date, total_in, total_out, transaction_count, category_breakdown, hourly_breakdown
     FROM daily_summaries
     WHERE user_id=$1 AND summary_date BETWEEN $2::date AND ($2::date + 6) ${pf}`,
    params
  )).rows;

  let total_in = 0, total_out = 0, transaction_count = 0;
  const cat: Record<string, Bucket> = {}, hourly: Record<string, Bucket> = {};
  const perDay: Record<string, { total_in: number; total_out: number; count: number }> = {};
  for (const r of rows) {
    total_in += Number(r.total_in); total_out += Number(r.total_out); transaction_count += r.transaction_count;
    mergeBuckets(cat, r.category_breakdown); mergeBuckets(hourly, r.hourly_breakdown);
    let d = perDay[r.date]; if (!d) { d = { total_in: 0, total_out: 0, count: 0 }; perDay[r.date] = d; }
    d.total_in += Number(r.total_in); d.total_out += Number(r.total_out); d.count += r.transaction_count;
  }

  const by_day = Object.entries(perDay)
    .map(([date, d]) => ({ date, total_in: d.total_in, total_out: d.total_out, count: d.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const busiestDay = by_day.reduce((m, d) => (d.count > (m?.count ?? -1) ? d : m), null as null | { date: string; count: number });
  const end = (() => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + 6); return ymd(d); })();

  return {
    start: s, end, total_in, total_out, net: total_in - total_out, transaction_count,
    busiest_day: busiestDay ? busiestDay.date : null,
    busiest_hour: busiestHourFromBuckets(hourly),
    by_category: await nameCategories(cat, lang),
    by_day,
  };
}

// ── Monthly ── read monthly rows (one per SIM); merge, and rebuild daily_trend/busiest across SIMs.
export async function getMonthly(userId: string, lang: Lang, year?: number, month?: number, phoneNumberIds?: string[]) {
  if (!year || !month) {
    const nowm = (await pool.query(
      `SELECT EXTRACT(YEAR FROM d)::int AS y, EXTRACT(MONTH FROM d)::int AS m
       FROM (SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date AS d) x`)).rows[0];
    year = year ?? nowm.y; month = month ?? nowm.m;
  }
  const params: any[] = [userId, year, month];
  let pf = "";
  if (phoneNumberIds?.length) { params.push(phoneNumberIds); pf = `AND phone_number_id = ANY($${params.length}::uuid[])`; }

  const rows = (await pool.query(
    `SELECT total_in, total_out, transaction_count, category_breakdown, hourly_breakdown, daily_trend
     FROM monthly_summaries WHERE user_id=$1 AND summary_year=$2 AND summary_month=$3 ${pf}`,
    params
  )).rows;

  let total_in = 0, total_out = 0, transaction_count = 0;
  const cat: Record<string, Bucket> = {}, hourly: Record<string, Bucket> = {};
  const perDay: Record<string, { total_in: number; total_out: number; count: number }> = {};
  for (const r of rows) {
    total_in += Number(r.total_in); total_out += Number(r.total_out); transaction_count += r.transaction_count;
    mergeBuckets(cat, r.category_breakdown); mergeBuckets(hourly, r.hourly_breakdown);
    for (const dt of (r.daily_trend ?? [])) {
      let d = perDay[dt.date]; if (!d) { d = { total_in: 0, total_out: 0, count: 0 }; perDay[dt.date] = d; }
      d.total_in += Number(dt.total_in ?? 0); d.total_out += Number(dt.total_out ?? 0); d.count += Number(dt.count ?? 0);
    }
  }

  const daily_trend = Object.entries(perDay)
    .map(([date, d]) => ({ date, total_in: d.total_in, total_out: d.total_out, count: d.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const busiestDay = daily_trend.reduce((m, d) => (d.count > (m?.count ?? -1) ? d : m), null as null | { date: string; count: number });

  return {
    year, month, total_in, total_out, net: total_in - total_out, transaction_count,
    busiest_day: busiestDay ? busiestDay.date : null,
    busiest_hour: busiestHourFromBuckets(hourly),
    by_category: await nameCategories(cat, lang),
    daily_trend,
  };
}

