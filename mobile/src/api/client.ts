// the real client. It 
// (a) attaches Authorization: Bearer <token>, 
// (b) unwraps your { success, data } envelope and returns just data, 
// (c) throws a typed ApiError carrying the backend's code/message/field, and 
// (d) on a 401, calls POST /auth/refresh once and retries — and if refresh fails, signs out (your single-session re-login rule). 
// This is the spine every screen's API calls run through.

import { useSession } from "../store/useSession";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  code: string;
  status: number;
  field?: string;
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; auth?: boolean };

async function requestEnvelope<T>(path: string, opts: Options = {}, isRetry = false): Promise<{ data: T; meta: any }> {
  const { method = "GET", body, auth = true } = opts;
  // const headers: Record<string, string> = { "Content-Type": "application/json" };
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const { accessToken } = useSession.getState();
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !isRetry) {
    const ok = await tryRefresh();
    if (ok) return requestEnvelope<T>(path, opts, true);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const err = json?.error ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Request failed", err.field);
  }
  return { data: json.data as T, meta: json.meta ?? null };
}

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  return (await requestEnvelope<T>(path, opts)).data;
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setAccessToken, signOut } = useSession.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && json.data?.accessToken) {
      await setAccessToken(json.data.accessToken);
      return true;
    }
  } catch {
    // network error — fall through to sign-out
  }
  await signOut(); // refresh failed → session revoked/expired → force re-login (Step 2)
  return false;
}


export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: "GET", auth }),
  getWithMeta: <T>(path: string, auth = true) => requestEnvelope<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "PATCH", body, auth }),
  del: <T>(path: string, auth = true) => request<T>(path, { method: "DELETE", auth }),
};

