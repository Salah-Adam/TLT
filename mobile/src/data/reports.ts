// Report repository. Reports are immutable once a period closes → cache permanently (never evicted),
// so a report a notification opened always shows its exact numbers offline. Network-first, cache fallback.
import { api } from "../api/client";
import { setCache, getCache } from "./cache";

type Cp = { counterparty_name: string | null; counterparty_number: string | null; counterparty_available: boolean; total: number; count: number };

export type ReportData = {
  period: "daily" | "weekly" | "monthly"; start: string; end: string; currency: string;
  total_in: number; total_out: number; net: number; transaction_count: number;
  vs_last_period: { in_change_percent: number | null; out_change_percent: number | null };
  trend: { bucket: string; spent: number }[];
  by_category: { category_id: string | null; name: string; amount: number; count: number; percent_of_spending: number }[];
  top_senders: Cp[]; top_recipients: Cp[];
  largest_transactions: { id: string; amount: number; direction: "in" | "out"; type: string; transacted_at: string; counterparty_name: string | null; counterparty_number: string | null; counterparty_available: boolean }[];
  busiest_day: string | null; busiest_hour: number | null;
  insights: string[];
};

export type ReportSel = { period: "daily" | "weekly" | "monthly"; date?: string; start?: string; year?: number; month?: number; simIds?: string[] };

function qs(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function cacheKey(sel: ReportSel): string {
  const anchor = sel.period === "daily" ? (sel.date ?? "current")
    : sel.period === "weekly" ? (sel.start ?? "current")
    : (sel.year && sel.month ? `${sel.year}-${sel.month}` : "current");
  const sims = sel.simIds?.length ? [...sel.simIds].sort().join(",") : "all";
  return `rep:${sel.period}:${anchor}:${sims}`;
}

export async function readReport(sel: ReportSel): Promise<ReportData | null> {
  const k = cacheKey(sel);
  const sims = sel.simIds?.length ? sel.simIds.join(",") : undefined;
  const path = `/api/v1/reports/${sel.period}${qs({ date: sel.date, start: sel.start, year: sel.year, month: sel.month, phone_number_ids: sims })}`;
  try {
    const data = await api.get<ReportData>(path);
    setCache(k, data).catch(() => {});     // background write
    return data;
  } catch {
    return (await getCache<ReportData>(k)) ?? null;
  }
}