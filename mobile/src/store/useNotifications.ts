// Tiny store holding the unread count → drives the bottom-tab badge (reactive).
import { create } from "zustand";
import { getUnread } from "../data/notifications";

type S = { unread: number; setUnread: (n: number) => void; refresh: () => Promise<void> };
export const useNotifications = create<S>((set) => ({
  unread: 0,
  setUnread: (n) => set({ unread: n }),
  refresh: async () => { try { set({ unread: await getUnread() }); } catch {} },
}));