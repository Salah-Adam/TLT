// data/phoneNumbers.ts — the user's SIM cards, for the Transactions SIM filter.
// Same offline pattern as categories: read local, refresh from API. We cache only what the
// filter needs (id, number, provider, display_name) — never the webhook_token.

// import { getDb } from "../db";
import { getDb, withDbLock } from "../db";

import { api } from "../api/client";

export type Sim = {
  id: string;
  number: string;
  provider: string | null;
  providerName: string | null;
  displayName: string | null;
  isPrimary: boolean;
};

type ApiPhone = {
  id: string; number: string; provider: string | null; provider_name: string | null;
  display_name: string | null; is_primary: boolean; is_active: boolean;
};

export async function readSims(): Promise<Sim[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT id, number, provider, provider_name, display_name, is_primary FROM phone_numbers ORDER BY is_primary DESC, number ASC"
  );
  return rows.map((r) => ({
    id: r.id, number: r.number, provider: r.provider,
    providerName: r.provider_name, displayName: r.display_name, isPrimary: !!r.is_primary,
  }));
}

export async function refreshSims(): Promise<void> {
  const list = await api.get<ApiPhone[]>("/api/v1/phone-numbers");
  const active = (list ?? []).filter((p) => p.is_active);
  const db = await getDb();
  // await db.withTransactionAsync(async () => {
  //   await db.execAsync("DELETE FROM phone_numbers");
  //   for (const p of active) {
  //     await db.runAsync(
  //       "INSERT OR REPLACE INTO phone_numbers (id, number, provider, provider_name, display_name, is_primary) VALUES (?,?,?,?,?,?)",
  //       [p.id, p.number, p.provider ?? null, p.provider_name ?? null, p.display_name ?? null, p.is_primary ? 1 : 0]
  //     );
  //   }
  // });
  
  await withDbLock(() => db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM phone_numbers");
    for (const p of active) {
      await db.runAsync(
        "INSERT OR REPLACE INTO phone_numbers (id, number, provider, provider_name, display_name, is_primary) VALUES (?,?,?,?,?,?)",
        [p.id, p.number, p.provider ?? null, p.provider_name ?? null, p.display_name ?? null, p.is_primary ? 1 : 0]
      );
    }
  }));
}

// Chip label: display_name if set, else the local number ("252" stripped → "61XXXXXXX").
export function simLabel(s: Sim): string {
  return s.providerName + "  " + s.number.replace(/^252/, "");
}


// Per-SIM accent color, from a stable hash of the id so it never shifts when a SIM is
// added/removed. Palette deliberately avoids money-in green / money-out red / emerald.
const SIM_COLORS = ["#2563EB", "#7C3AED", "#D97706", "#0D9488", "#DB2777", "#4F46E5"];
export function simColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SIM_COLORS[h % SIM_COLORS.length];
}

// Top-left eyebrow for a transaction row: "Hormuud · 61XXXXXXX" (or the SIM's display name).
export function simEyebrow(sim: Sim): string {
  const name = sim.displayName || sim.providerName || sim.provider || "SIM";
  return `${name} · ${sim.number.replace(/^252/, "")}`;
}


// ── Settings: full phone-number management (network, not the SIM cache above) ──
// GET /phone-numbers also returns webhook_token (a secret) — we deliberately drop it here.

export type PhoneNumber = {
  id: string;
  number: string;
  provider: string | null;
  provider_name: string | null;
  display_name: string | null;
  classification: "individual" | "business" | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
};

type ApiPhoneFull = ApiPhone & {
  classification: "individual" | "business" | null;
  created_at: string;
  webhook_token?: string; // present in the response — intentionally ignored
};

export async function listPhoneNumbers(): Promise<PhoneNumber[]> {
  const list = await api.get<ApiPhoneFull[]>("/api/v1/phone-numbers");
  return (list ?? []).map((p) => ({
    id: p.id, number: p.number, provider: p.provider, provider_name: p.provider_name,
    display_name: p.display_name, classification: p.classification ?? null,
    is_primary: p.is_primary, is_active: p.is_active, created_at: p.created_at,
  }));
}

// Add flow — step 1 (sends an OTP to the number).
export async function addPhoneNumber(input: { number: string; displayName?: string; classification?: "individual" | "business" }): Promise<void> {
  await api.post("/api/v1/phone-numbers", {
    number: input.number,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.classification ? { classification: input.classification } : {}),
  });
}

// Add flow — step 2 (verifies the OTP and registers the number).
export async function verifyPhoneNumber(input: { number: string; otp: string; displayName?: string; classification?: "individual" | "business" }): Promise<void> {
  await api.post("/api/v1/phone-numbers/verify", {
    number: input.number, otp: input.otp,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.classification ? { classification: input.classification } : {}),
  });
}

// Reclaim (number belongs to another account) — request + verify.
export async function reclaimNumber(number: string): Promise<void> {
  await api.post("/api/v1/phone-numbers/reclaim", { number });
}
export async function reclaimNumberVerify(number: string, otp: string): Promise<void> {
  await api.post("/api/v1/phone-numbers/reclaim/verify", { number, otp });
}

// Delete — the backend deletes the whole account when it's your LAST active number.
export async function deletePhoneNumber(id: string): Promise<{ accountDeleted: boolean }> {
  const r = await api.del<{ message: string; accountDeleted?: boolean }>(`/api/v1/phone-numbers/${id}`);
  return { accountDeleted: !!r?.accountDeleted };
}
