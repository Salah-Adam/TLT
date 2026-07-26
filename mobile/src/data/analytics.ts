// Analytics repository. Rolling/live: fetch daily/monthly breakdowns (scoped by SIM) and cache
// each combo in kv_cache, so a previously-viewed period stays available offline.
import { api } from "../api/client";
import { setCache, getCache } from "./cache";

export type AnCategory = { category_id: string | null; name: string; amount: number; count: number };

export type DailyAnalytics = {
  date: string; total_in: number; total_out: number; net: number;
  transaction_count: number; count_in: number; count_out: number;
  largest_in: number | null; largest_out: number | null;
  by_category: AnCategory[];
  by_hour: { hour: number; total_in: number; total_out: number; count: number }[];
};

export type WeeklyAnalytics = {
  start: string; end: string; total_in: number; total_out: number; net: number;
  transaction_count: number; busiest_day: string | null; busiest_hour: number | null;
  by_category: AnCategory[];
  by_day: { date: string; total_in: number; total_out: number; count: number }[];
};

export type AnalyticsSel =
  | { period: "daily"; date: string; simIds: string[] }
  | { period: "weekly"; start: string; simIds: string[] }
  | { period: "monthly"; year: number; month: number; simIds: string[] 

};

export type MonthlyAnalytics = {
  year: number; month: number; total_in: number; total_out: number; net: number;
  transaction_count: number; busiest_day: string | null; busiest_hour: number | null;
  by_category: AnCategory[];
  daily_trend: { date: string; total_in: number; total_out: number; count: number }[];
};


const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function qs(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function cacheKey(sel: AnalyticsSel): string {
  const sims = sel.simIds.length ? [...sel.simIds].sort().join(",") : "all";
  return sel.period === "daily" ? `an:d:${sel.date}:${sims}`
    : sel.period === "weekly" ? `an:w:${sel.start}:${sims}`
    : `an:m:${sel.year}-${sel.month}:${sims}`;
}


// Try the network (fresh + cache it); on any failure (offline), fall back to the cached combo.
export async function readAnalytics(sel: AnalyticsSel): Promise<DailyAnalytics | MonthlyAnalytics | null> {
  const key = cacheKey(sel);
  const sims = sel.simIds.length ? sel.simIds.join(",") : undefined;

  const path = sel.period === "daily"
    ? `/api/v1/analytics/daily${qs({ date: sel.date, phone_number_ids: sims })}`
    : sel.period === "weekly"
    ? `/api/v1/analytics/weekly${qs({ start: sel.start, phone_number_ids: sims })}`
    : `/api/v1/analytics/monthly${qs({ year: sel.year, month: sel.month, phone_number_ids: sims })}`;
    
  try {
    const data = await api.get<any>(path);
    setCache(key, data).catch(() => {});   // cache in the background — don't block the screen
    return data;
  } catch {
    return (await getCache<any>(key)) ?? null;
  }
}

// Keep the default view (today + current month, all SIMs) fresh with each sync.
export async function refreshAnalytics(): Promise<void> {
  const now = new Date();
  await Promise.all([
    readAnalytics({ period: "daily", date: ymd(now), simIds: [] }),
    readAnalytics({ period: "monthly", year: now.getFullYear(), month: now.getMonth() + 1, simIds: [] }),
  ]);
}