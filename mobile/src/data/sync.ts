// ne place that refreshes all cached data and stamps lastSyncedAt. As we build feature screens, each adds its refreshX() call here, so "sync" stays a single function.


import { refreshCategories } from "./categories";
import { setMeta, getMeta } from "./cache";

const LAST_SYNCED = "last_synced_at";

// Pulls everything we cache, then records when. Later steps add more refreshers here.
export async function syncAll(): Promise<void> {
  await refreshCategories();
  await setMeta(LAST_SYNCED, new Date().toISOString());
}
export async function getLastSynced(): Promise<string | null> {
  return getMeta(LAST_SYNCED);
}