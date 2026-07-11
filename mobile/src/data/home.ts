//   the Home repository following the Step-3 pattern — refreshHome pulls the three endpoints in parallel and caches each as a snapshot; 
// readHome assembles them from cache into one HomeData (summing balances, taking the top 3 categories, the 5 most recent). 
// Note limit=10 (the API's minimum is 10) then we slice to 5 — that would've 400'd at limit=5.

import { api } from "../api/client";
import { setCache, getCache } from "./cache";

import { readTransactions } from "./transactions";

// type Dashboard = {
//   today: { total_in: number; total_out: number };
//   this_month: { total_in: number; total_out: number; net: number };
//   estimated_balances: { estimated_balance: number }[];
// };

type Dashboard = {
  today: { total_in: number; total_out: number };
  this_week: { total_out: number; vs_last_week: { out_change_percent: number | null } };
  this_month: { total_in: number; total_out: number; net: number };
  estimated_balances: { estimated_balance: number }[];
};

type Monthly = { by_category: { category_id: string | null; name: string; amount: number }[] };
// export type TxRow = {
//   id: string; amount: number; currency: string; direction: "in" | "out";
//   counterparty_name: string | null; counterparty_number: string | null;
//   category: { id: string | null; name: string } | null; transacted_at: string;
// };

export type TxRow = {
  id: string; amount: number; currency: string; direction: "in" | "out";
  counterparty_name: string | null; counterparty_number: string | null;
  category: { id: string | null; name: string } | null; transacted_at: string;
  balance_after: number | null;
};

type TxList = TxRow[];
export type HomeData = {
  balance: number;
  today: { in: number; out: number };
  week: { out: number; changePercent: number | null };
  month: { in: number; out: number; net: number };
  topCategories: { id: string | null; name: string; amount: number }[];
  recent: TxRow[];
};

// type Monthly = { by_category: { name: string; amount: number }[] };
// export type TxRow = {
//   id: string; amount: number; currency: string; direction: "in" | "out";
//   counterparty_name: string | null; category: { id: string; name: string } | null; transacted_at: string;
// };
// type TxList = TxRow[];

// export type HomeData = {
//   balance: number;
//   today: { in: number; out: number };
//   month: { in: number; out: number; net: number };
//   topCategories: { name: string; amount: number }[];
//   recent: TxRow[];
// };



const K_DASH = "home_dashboard";
const K_MONTH = "home_monthly";
// const K_RECENT = "home_recent";

// Online: fetch the 3 sources in parallel and cache each snapshot.
// export async function refreshHome(): Promise<void> {
//   const [dash, month, recent] = await Promise.all([
//     api.get<Dashboard>("/api/v1/analytics/dashboard"),
//     api.get<Monthly>("/api/v1/analytics/monthly"),
//     api.get<TxList>("/api/v1/transactions?limit=10"),
//   ]);
//   await setCache(K_DASH, dash);
//   await setCache(K_MONTH, month);
//   await setCache(K_RECENT, recent);
// }
export async function refreshHome(): Promise<void> {
  const [dash, month] = await Promise.all([
    api.get<Dashboard>("/api/v1/analytics/dashboard"),
    api.get<Monthly>("/api/v1/analytics/monthly"),
  ]);
  await setCache(K_DASH, dash);
  await setCache(K_MONTH, month);
}

// Always reads from cache → works offline.
export async function readHome(): Promise<HomeData | null> {
  const dash = await getCache<Dashboard>(K_DASH);
  if (!dash) return null;
  // const month = await getCache<Monthly>(K_MONTH);
  // const recent = (await getCache<TxList>(K_RECENT)) ?? [];
  const month = await getCache<Monthly>(K_MONTH);

  // const recentTx = await readTransactions(5);
  // const seen = new Set<string>();
  // const recent: TxRow[] = recentTx
  //   .filter((tx) => (seen.has(tx.id) ? false : (seen.add(tx.id), true)))
  //   .map((tx) => ({
  //     id: tx.id, amount: tx.amount, currency: tx.currency, direction: tx.direction,
  //     counterparty_name: tx.counterparty_name, counterparty_number: tx.counterparty_number,
  //     category: tx.category, transacted_at: tx.transacted_at, balance_after: tx.balance_after,
  //   }));

  const recentTx = await readTransactions(5);
  const seen = new Set<string>();
  const recent: TxRow[] = recentTx
    .filter((tx) => (seen.has(tx.id) ? false : (seen.add(tx.id), true)))
    .map((tx) => ({
      id: tx.id, amount: tx.amount, currency: tx.currency, direction: tx.direction,
      counterparty_name: tx.counterparty_name, counterparty_number: tx.counterparty_number,
      category: tx.category, transacted_at: tx.transacted_at, balance_after: tx.balance_after,
    }));


  // const recentTx = await readTransactions(5);
  // const recent: TxRow[] = recentTx.map((tx) => ({
  //   id: tx.id, amount: tx.amount, currency: tx.currency, direction: tx.direction,
  //   counterparty_name: tx.counterparty_name, counterparty_number: tx.counterparty_number,
  //   category: tx.category, transacted_at: tx.transacted_at, balance_after: tx.balance_after,
  // }));

  const balance = (dash.estimated_balances ?? []).reduce((s, b) => s + (b.estimated_balance ?? 0), 0);
  return {
    balance,
    today: { in: dash.today?.total_in ?? 0, out: dash.today?.total_out ?? 0 },
    week: { out: dash.this_week?.total_out ?? 0, changePercent: dash.this_week?.vs_last_week?.out_change_percent ?? null },
    month: { in: dash.this_month?.total_in ?? 0, out: dash.this_month?.total_out ?? 0, net: dash.this_month?.net ?? 0 },
    // topCategories: (month?.by_category ?? []).slice(0, 3).map((c) => ({ name: c.name, amount: c.amount })),
    topCategories: (month?.by_category ?? []).slice(0, 3).map((c) => ({ id: c.category_id, name: c.name, amount: c.amount })),
    recent: recent.slice(0, 5),
  };
}