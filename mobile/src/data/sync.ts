// ne place that refreshes all cached data and stamps lastSyncedAt. As we build feature screens, each adds its refreshX() call here, so "sync" stays a single function.


import { refreshCategories } from "./categories";
import { refreshHome } from "./home";
import { refreshTransactions } from "./transactions";
import { refreshSims } from "./phoneNumbers";
import { setMeta, getMeta } from "./cache";

const LAST_SYNCED = "last_synced_at";

export async function syncAll(): Promise<void> {
  await refreshCategories();
  await refreshHome();
  await refreshTransactions();
  await refreshSims();
  await setMeta(LAST_SYNCED, new Date().toISOString());
}
export async function getLastSynced(): Promise<string | null> {
  return getMeta(LAST_SYNCED);
}

// import { refreshCategories } from "./categories";
// import { refreshHome } from "./home";
// import { refreshTransactions } from "./transactions";
// import { setMeta, getMeta } from "./cache";

// const LAST_SYNCED = "last_synced_at";

// export async function syncAll(): Promise<void> {
//   await refreshCategories();
//   await refreshHome();
//   await refreshTransactions();
//   await setMeta(LAST_SYNCED, new Date().toISOString());
// }
// export async function getLastSynced(): Promise<string | null> {
//   return getMeta(LAST_SYNCED);
// }
