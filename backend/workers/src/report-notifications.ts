import { pool } from "./db";
import { sendPush } from "./services/fcm";

export type ReportPeriod = "daily" | "weekly" | "monthly";

function money(amount: number, currency: string): string {
  const n = amount.toFixed(2);
  return currency === "USD" ? `$${n}` : `${n} ${currency}`;
}

interface Anchor { start: string; end: string; data: Record<string, unknown>; }

/** Resolve the just-completed window for a period (EAT) + the deep-link payload. */
async function resolveAnchor(period: ReportPeriod): Promise<Anchor> {
  if (period === "daily") {
    const d = (await pool.query(`SELECT (now() AT TIME ZONE 'Africa/Mogadishu')::date::text AS d`)).rows[0].d;
    return { start: d, end: d, data: { screen: "report", period: "daily", date: d, scope: "user" } };
  }
  if (period === "weekly") {
    const r = (await pool.query(
      `SELECT ((now() AT TIME ZONE 'Africa/Mogadishu')::date - 7)::text AS s,
              ((now() AT TIME ZONE 'Africa/Mogadishu')::date - 1)::text AS e`
    )).rows[0];
    return { start: r.s, end: r.e, data: { screen: "report", period: "weekly", start: r.s, scope: "user" } };
  }
  // monthly → previous calendar month
  const r = (await pool.query(
    `WITH m AS (SELECT (date_trunc('month',(now() AT TIME ZONE 'Africa/Mogadishu')::date) - INTERVAL '1 month')::date AS s)
     SELECT s::text AS start,
            ((s + INTERVAL '1 month' - INTERVAL '1 day')::date)::text AS "end",
            EXTRACT(YEAR FROM s)::int AS y, EXTRACT(MONTH FROM s)::int AS mo
     FROM m`
  )).rows[0];
  return { start: r.start, end: r.end, data: { screen: "report", period: "monthly", year: r.y, month: r.mo, scope: "user" } };
}

const TITLES: Record<ReportPeriod, { en: string; so: string }> = {
  daily:   { en: "Your daily report is ready",   so: "Warbixintaada maalinlaha ah waa diyaar" },
  weekly:  { en: "Your weekly report is ready",  so: "Warbixintaada todobaadlaha ah waa diyaar" },
  monthly: { en: "Your monthly report is ready", so: "Warbixintaada bishii ah waa diyaar" },
};
const TYPES: Record<ReportPeriod, string> = {
  daily: "daily_summary", weekly: "weekly_summary", monthly: "monthly_summary",
};

export async function runReportNotifications(period: ReportPeriod): Promise<void> {
  const startedAt = Date.now();
  const anchor = await resolveAnchor(period);
  const currency = "USD";

  // One pass: per active user who had activity in the window.
  const rows = (await pool.query(
    `SELECT t.user_id, u.language,
            COALESCE(SUM(t.amount) FILTER (WHERE t.direction='in'),0)::float  AS total_in,
            COALESCE(SUM(t.amount) FILTER (WHERE t.direction='out'),0)::float AS total_out,
            COUNT(*)::int AS count
     FROM transactions t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL AND u.is_active = TRUE
     WHERE t.transacted_date BETWEEN $1 AND $2
     GROUP BY t.user_id, u.language
     HAVING COUNT(*) > 0`,
    [anchor.start, anchor.end]
  )).rows;

  let made = 0;
  for (const r of rows) {
    const inM = money(r.total_in, currency);
    const outM = money(r.total_out, currency);

    const titleEn = TITLES[period].en;
    const titleSo = TITLES[period].so;
    const bodyEn = `You received ${inM} and spent ${outM}. Tap to see your insights.`;
    const bodySo = `Waxaad heshay ${inM} waxaadna bixisay ${outM}. Riix si aad warbixinta u aragto.`;

    const stored = await pool.query(
      `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [r.user_id, TYPES[period], titleEn, titleSo, bodyEn, bodySo, JSON.stringify(anchor.data)]
    );
    const id = stored.rows[0].id;

    // Push in the user's language (dry-run until Phase 6 — no device token yet).
    const lang = r.language === "en" ? "en" : "so";
    const messageId = await sendPush({
      token: null,
      title: lang === "so" ? titleSo : titleEn,
      body:  lang === "so" ? bodySo : bodyEn,
      data: anchor.data,
    });
    if (messageId) await pool.query(`UPDATE notifications SET fcm_message_id=$1 WHERE id=$2`, [messageId, id]);
    made++;
  }

  console.log(`report-notify (${period}): created ${made} notification(s) for ${anchor.start}..${anchor.end} in ${Date.now() - startedAt}ms`);
}