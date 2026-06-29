//   tiny store holding online, fed by @react-native-community/netinfo. init() subscribes and returns the unsubscribe. The key bit: on an offline→online transition while logged in, it runs syncAll() — that's your "sync on reconnect" rule. No circular imports (this imports session + sync; neither imports this).


import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";
import { useSession } from "./useSession";
import { syncAll } from "../data/sync";

type NetState = { online: boolean; init: () => () => void };

export const useNetwork = create<NetState>((set, get) => ({
  online: true,
  init: () => {
    const unsub = NetInfo.addEventListener((s) => {
      const online = s.isConnected !== false;
      const wasOnline = get().online;
      set({ online });
      // reconnected → pull fresh data, but only if signed in
      if (online && !wasOnline && useSession.getState().accessToken) {
        syncAll().catch(() => {});
      }
    });
    return unsub;
  },
}));