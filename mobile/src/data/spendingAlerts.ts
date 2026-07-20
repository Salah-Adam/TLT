// data/spendingAlerts.ts — per-category budget alerts (Home ⋮ → "Spending alerts").
// Network-first with a kv_cache fallback (offline shows the last snapshot; writes are online-only).
// NOT in syncAll — only reached from the ⋮ menu, so it refreshes when opened.
import { api } from "../api/client";
import { setCache, getCache } from "./cache";

import { type Tx } from "./transactions";

export type SpendingAlert = {
  id: string;
  category: { id: string; name: string };
  phone_number_id: string | null;
  phone_number: string | null;
  period: "weekly" | "monthly";
  limit_amount: number;
  alert_threshold: number;
  is_active: boolean;
  last_alerted_at: string | null;
  progress: { spent: number; percent: number; period_start: string; period_end: string };
};

export type AlertTxSummary = { spent: number; count: number };
export type AlertTxPage = { items: Tx[]; cursor: string | null; hasMore: boolean; summary?: AlertTxSummary };

export async function getAlertTransactions(
  alertId: string,
  opts: { cursor?: string | null; dateFrom?: string; dateTo?: string } = {}
): Promise<AlertTxPage> {
  const parts = [
    opts.dateFrom ? `date_from=${opts.dateFrom}` : "",
    opts.dateTo ? `date_to=${opts.dateTo}` : "",
    opts.cursor ? `cursor=${encodeURIComponent(opts.cursor)}` : "",
    "limit=50",
  ].filter(Boolean).join("&");
  const { data, meta } = await api.getWithMeta<Tx[]>(`/api/v1/spending-alerts/${alertId}/transactions?${parts}`);
  const s = (meta as any)?.summary;
  return {
    items: data ?? [],
    cursor: (meta as any)?.cursor ?? null,
    hasMore: !!(meta as any)?.has_more,
    summary: s ? { spent: Number(s.spent ?? 0), count: Number(s.count ?? 0) } : undefined,
  };
}

const LIST_KEY = "alerts:list";

export async function readAlerts(): Promise<SpendingAlert[]> {
  try { const data = await api.get<SpendingAlert[]>("/api/v1/spending-alerts"); setCache(LIST_KEY, data).catch(() => {}); return data ?? []; }
  catch { return (await getCache<SpendingAlert[]>(LIST_KEY)) ?? []; }
}

export async function createAlert(input: {
  categoryId: string; limitAmount: number; period: "weekly" | "monthly"; alertThreshold: number; phoneNumberId?: string | null;
}): Promise<SpendingAlert> {
  const body: any = { categoryId: input.categoryId, limitAmount: input.limitAmount, period: input.period, alertThreshold: input.alertThreshold };
  if (input.phoneNumberId) body.phoneNumberId = input.phoneNumberId;
  return api.post<SpendingAlert>("/api/v1/spending-alerts", body);
}

export async function updateAlert(id: string, input: { limitAmount?: number; alertThreshold?: number; isActive?: boolean }): Promise<SpendingAlert> {
  return api.patch<SpendingAlert>(`/api/v1/spending-alerts/${id}`, input);
}

export async function deleteAlert(id: string): Promise<void> {
  await api.del(`/api/v1/spending-alerts/${id}`);
}