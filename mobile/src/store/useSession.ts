//  the app-wide source of truth for "who's logged in.
// " hydrate() loads tokens on startup; signIn/signOut are what the login screen (Step 2) 
// and the menu will call. The isAuthenticated check is just !!accessToken.

import { create } from "zustand";
import { tokenStore } from "../api/tokens";
import { wipeDb } from "../api/../db"; // i.e. "../db"


export type User = { id: string; full_name: string; language: "en" | "so" } | null;

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (tokens: { accessToken: string; refreshToken: string }, user?: User) => Promise<void>;
  setAccessToken: (access: string) => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    const { access, refresh } = await tokenStore.load();
    set({ accessToken: access, refreshToken: refresh, hydrated: true });
  },
  signIn: async (tokens, user = null) => {
    await tokenStore.save(tokens.accessToken, tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  },
  setAccessToken: async (access) => {
    await tokenStore.saveAccess(access);
    set({ accessToken: access });
  },
  setUser: (user) => set({ user }),
  signOut: async () => {
    await tokenStore.clear();
    try { await wipeDb(); } catch {}
    set({ accessToken: null, refreshToken: null, user: null });
  },
  // signOut: async () => {
  //   await tokenStore.clear();
  //   set({ accessToken: null, refreshToken: null, user: null });
  // },
}));