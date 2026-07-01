// A reactive tick that increments after every syncAll, so screens can re-read the fresh cache.
import { create } from "zustand";

type SyncState = { tick: number; bump: () => void };
export const useSync = create<SyncState>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));