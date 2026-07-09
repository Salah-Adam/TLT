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
  return s.displayName || s.number.replace(/^252/, "");
}