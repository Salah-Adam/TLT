// data/profile.ts — account settings: profile read/update, password, language switch, logout.
// Always network (settings are fetched fresh). Language + logout orchestrate the session stores
// so the change takes effect app-wide.
import { api } from "../api/client";
import { authApi } from "../api/auth";
import { useSession } from "../store/useSession";
import { useLanguage } from "../store/useLanguage";
import { syncAll } from "./sync";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  language: "en" | "so";
  age: number | null;
  city: string | null;
  sex: "male" | "female" | null;
  created_at: string;
};

export type ProfilePatch = {
  full_name?: string;
  email?: string | null;
  age?: number | null;
  city?: string | null;
  sex?: "male" | "female" | null;
};

export async function getProfile(): Promise<Profile> {
  return api.get<Profile>("/api/v1/users/me");
}

export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  const updated = await api.patch<Profile>("/api/v1/users/me", patch);
  const s = useSession.getState();           // keep the Home greeting/name fresh
  if (s.user) s.setUser({ ...s.user, full_name: updated.full_name });
  return updated;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/api/v1/users/me/change-password", { currentPassword, newPassword });
}

// Language: the backend re-issues an access token carrying the new language. Swap the token,
// flip i18n + the session, then re-pull server-localized data (category names, notifications…).
export async function changeLanguage(language: "en" | "so"): Promise<void> {
  const r = await api.patch<{ language: "en" | "so"; accessToken: string }>("/api/v1/users/me/language", { language });
  await useSession.getState().setAccessToken(r.accessToken);
  useLanguage.getState().setLanguage(r.language);
  const s = useSession.getState();
  if (s.user) s.setUser({ ...s.user, language: r.language });
  try { await syncAll(); } catch { /* offline-safe */ }
}

// Logout: best-effort server revoke, then clear the local session + encrypted cache.
export async function logout(): Promise<void> {
  const { refreshToken, signOut } = useSession.getState();
  try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* best-effort */ }
  await signOut();
}