// setCache/getCache store whole API responses as JSON for the "fixed-period / snapshot" data (Steps 4 & 7); setMeta/getMeta are the tiny key/value store for things like the last-synced timestamp.



import { getDb } from "../db";

// Generic JSON snapshot cache (for dashboard / reports in later steps).
export async function setCache(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO kv_cache (key, value, fetched_at) VALUES (?, ?, ?)",
    [key, JSON.stringify(value), new Date().toISOString()]
  );
}
export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM kv_cache WHERE key = ?", [key]);
  return row ? (JSON.parse(row.value) as T) : null;
}

// meta key/value (lastSyncedAt lives here).
export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [key, value]);
}
export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value ?? null;
}