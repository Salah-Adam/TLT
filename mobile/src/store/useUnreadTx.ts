// Unread-transactions count → drives the Transactions tab badge (server is source of truth).
import { create } from "zustand";
import { unreadTxCount, markAllTxSeen } from "../data/transactions";

type S = { count: number; set: (n: number) => void; refresh: () => Promise<void>; markAll: () => Promise<void> };
export const useUnreadTx = create<S>((set) => ({
  count: 0,
  set: (n) => set({ count: n }),
  refresh: async () => { try { set({ count: await unreadTxCount() }); } catch {} },
  markAll: async () => { set({ count: 0 }); try { await markAllTxSeen(); } catch {} }, // optimistic
}));