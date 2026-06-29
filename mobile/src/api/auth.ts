// // all auth endpoints in one typed module, plus finishAuth() which centralizes the post-login routine (save tokens → load /users/me → set the UI language). 
// // Login, register, and reset all reuse it, so the "what happens after you get tokens" logic lives in exactly one spot.


import { api } from "./client";
import { useSession } from "../store/useSession";
import { useLanguage } from "../store/useLanguage";
import { syncAll } from "../data/sync";

type Tokens = { accessToken: string; refreshToken: string };
export type Me = { id: string; full_name: string; phone_number: string; language: "en" | "so"; email: string | null };

export const authApi = {
  register: (input: { fullName: string; phoneNumber: string; password: string; language: "en" | "so" }) =>
    api.post<{ phoneNumber: string }>("/api/v1/auth/register", input, false),
  verifyOtp: (phoneNumber: string, otp: string) =>
    api.post<Tokens>("/api/v1/auth/verify-otp", { phoneNumber, otp, deviceInfo: "TLT Android" }, false),
  reclaim: (input: { fullName: string; phoneNumber: string; password: string; language: "en" | "so" }) =>
    api.post<{ phoneNumber: string }>("/api/v1/auth/reclaim", input, false),
  reclaimVerify: (phoneNumber: string, otp: string) =>
    api.post<{ accessToken: string; refreshToken: string }>(
      "/api/v1/auth/reclaim/verify", { phoneNumber, otp, deviceInfo: "TLT Android" }, false),
  login: (phoneNumber: string, password: string) =>
    api.post<Tokens>("/api/v1/auth/login", { phoneNumber, password, deviceInfo: "TLT Android" }, false),
  forgotPassword: (phoneNumber: string) =>
    api.post<{ message: string }>("/api/v1/auth/forgot-password", { phoneNumber }, false),
  resetPassword: (phoneNumber: string, otp: string, newPassword: string) =>
    api.post<{ accessToken: string; refreshToken: string }>(
      "/api/v1/auth/reset-password", { phoneNumber, otp, newPassword, deviceInfo: "TLT Android" }, false), 
  getMe: () => api.get<Me>("/api/v1/users/me"),
  logout: (refreshToken: string) => api.post("/api/v1/auth/logout", { refreshToken }, false),
};

// export async function finishAuth(tokens: Tokens) {
//   await useSession.getState().signIn(tokens);
//   const me = await authApi.getMe();
//   useSession.getState().setUser({ id: me.id, full_name: me.full_name, language: me.language });
//   useLanguage.getState().setLanguage(me.language);
// };

// right after login we do a full pull so the local cache is populated immediately. It's wrapped in try/catch so a sync hiccup never blocks getting into the app.

export async function finishAuth(tokens: Tokens) {
  await useSession.getState().signIn(tokens);
  const me = await authApi.getMe();
  useSession.getState().setUser({ id: me.id, full_name: me.full_name, language: me.language });
  useLanguage.getState().setLanguage(me.language);
  try { await syncAll(); } catch { /* best-effort; offline-safe */ }
};



// import { api } from "./client";
// import { useSession } from "../store/useSession";
// import { useLanguage } from "../store/useLanguage";

// type Tokens = { accessToken: string; refreshToken: string };
// export type Me = { id: string; full_name: string; phone_number: string; language: "en" | "so"; email: string | null };

// export const authApi = {
//   login: (phoneNumber: string, password: string) =>
//     api.post<Tokens>("/api/v1/auth/login", { phoneNumber, password, deviceInfo: "TLT Android" }, false),
//   getMe: () => api.get<Me>("/api/v1/users/me"),
//   logout: (refreshToken: string) => api.post("/api/v1/auth/logout", { refreshToken }, false),
// };

// // Run after any successful tokens: save them, load profile, set the UI language from the account.
// export async function finishAuth(tokens: Tokens) {
//   await useSession.getState().signIn(tokens);
//   const me = await authApi.getMe();
//   useSession.getState().setUser({ id: me.id, full_name: me.full_name, language: me.language });
//   useLanguage.getState().setLanguage(me.language);
// }