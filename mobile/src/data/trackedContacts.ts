// data/trackedContacts.ts — Tracked people (Home ⋮ → "Tracked people").
// Network-first with a kv_cache fallback (same resilient pattern as reports.ts/analytics.ts):
// the list shows instantly offline from the last snapshot; writes and the timeline are online-only.
// NOT added to syncAll — this is only reached from the ⋮ menu, so it refreshes when you open it.
import { api } from "../api/client";
import { setCache, getCache } from "./cache";

export type ContactNumber = { id: string; number: string | null; available: boolean };

export type TrackedContact = {
  id: string;
  label: string;
  tracking_direction: "sent" | "received" | "both";
  is_active: boolean;
  created_at: string;
  total_sent: number;
  total_received: number;
  net: number;
  transaction_count: number;
  last_transaction_at: string | null;
  numbers: ContactNumber[];
};

export type ContactTx = {
  id: string; amount: number; currency: string; direction: "in" | "out"; type: string | null;
  phone_number_id: string | null;
  counterparty_name: string | null; counterparty_number: string | null; counterparty_available: boolean;
  category: { id: string; name: string } | null;
  note: string | null; transacted_at: string; transacted_date: string;
};

// -- the newer one. the above is the old - just added the needed line
// export type ContactTx = {
//   id: string; amount: number; currency: string; direction: "in" | "out"; type: string | null;
//   phone_number_id: string | null;
//   counterparty_name: string | null; counterparty_number: string | null; counterparty_available: boolean;
//   category: { id: string; name: string } | null; note: string | null; transacted_at: string; transacted_date: string;
// };

export type ContactSummary = { total_sent: number; total_received: number; net: number; transaction_count: number };
export type ContactTxPage = { items: ContactTx[]; cursor: string | null; hasMore: boolean; summary: ContactSummary | null };

// export type ContactTxPage = { items: ContactTx[]; cursor: string | null; hasMore: boolean };

const LIST_KEY = "contacts:list";

// ── list (offline-safe) ──
export async function readContacts(): Promise<TrackedContact[]> {
  try {
    const data = await api.get<TrackedContact[]>("/api/v1/tracked-contacts");
    setCache(LIST_KEY, data).catch(() => {}); // background write
    return data ?? [];
  } catch {
    return (await getCache<TrackedContact[]>(LIST_KEY)) ?? [];
  }
}

// ── one contact (server-fresh, else the cached list entry) ──
export async function readContact(id: string): Promise<TrackedContact | null> {
  try {
    return await api.get<TrackedContact>(`/api/v1/tracked-contacts/${id}`);
  } catch {
    const list = (await getCache<TrackedContact[]>(LIST_KEY)) ?? [];
    return list.find((c) => c.id === id) ?? null;
  }
}

// ── writes (online only) ──
export async function createContact(input: {
  label: string; trackingDirection: "sent" | "received" | "both"; phoneNumbers: string[];
}): Promise<TrackedContact> {
  return api.post<TrackedContact>("/api/v1/tracked-contacts", input);
}

export async function updateContact(id: string, input: {
  label?: string; trackingDirection?: "sent" | "received" | "both"; isActive?: boolean;
}): Promise<TrackedContact> {
  return api.patch<TrackedContact>(`/api/v1/tracked-contacts/${id}`, input);
}

export async function deleteContact(id: string): Promise<void> {
  await api.del(`/api/v1/tracked-contacts/${id}`);
}

export async function addNumber(id: string, number: string): Promise<TrackedContact> {
  return api.post<TrackedContact>(`/api/v1/tracked-contacts/${id}/numbers`, { number });
}

export async function removeNumber(id: string, numberId: string): Promise<void> {
  await api.del(`/api/v1/tracked-contacts/${id}/numbers/${numberId}`);
}



// ── timeline (online, paginated, optional number/date filters) ──
// export async function getContactTransactions(
//   id: string, cursor?: string | null,
//   filters?: { numberId?: string | null; dateFrom?: string; dateTo?: string }
// ): Promise<ContactTxPage> {
//   const parts: string[] = ["limit=50"];
//   if (cursor) parts.push(`cursor=${encodeURIComponent(cursor)}`);
//   if (filters?.numberId) parts.push(`number_id=${encodeURIComponent(filters.numberId)}`);
//   if (filters?.dateFrom) parts.push(`date_from=${encodeURIComponent(filters.dateFrom)}`);
//   if (filters?.dateTo)   parts.push(`date_to=${encodeURIComponent(filters.dateTo)}`);
//   const { data, meta } = await api.getWithMeta<ContactTx[]>(`/api/v1/tracked-contacts/${id}/transactions?${parts.join("&")}`);
//   return { items: data ?? [], cursor: meta?.cursor ?? null, hasMore: !!meta?.has_more };
// }

export async function getContactTransactions(
  id: string, cursor?: string | null,
  filters?: { numberIds?: string[]; dateFrom?: string; dateTo?: string }
): Promise<ContactTxPage> {
  const parts: string[] = ["limit=50"];
  if (cursor) parts.push(`cursor=${encodeURIComponent(cursor)}`);
  if (filters?.numberIds?.length) parts.push(`number_ids=${encodeURIComponent(filters.numberIds.join(","))}`);
  if (filters?.dateFrom) parts.push(`date_from=${encodeURIComponent(filters.dateFrom)}`);
  if (filters?.dateTo)   parts.push(`date_to=${encodeURIComponent(filters.dateTo)}`);
  const { data, meta } = await api.getWithMeta<ContactTx[]>(`/api/v1/tracked-contacts/${id}/transactions?${parts.join("&")}`);
//   return { items: data ?? [], cursor: meta?.cursor ?? null, hasMore: !!meta?.has_more };
  return { items: data ?? [], cursor: meta?.cursor ?? null, hasMore: !!meta?.has_more, summary: meta?.summary ?? null };
}