//  getDb now also creates the cache tables on first open (IF NOT EXISTS, so it runs once). Three tables: categories (our first cached entity), kv_cache (generic JSON snapshots for dashboard/reports later), and meta (holds lastSyncedAt). wipeDb empties them for logout. (The leftover smoke table from 3A is harmless — ignore it.)

import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const KEY_NAME = "tlt_db_key";
let dbInstance: SQLite.SQLiteDatabase | null = null;

// let dbInstance: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, is_system INTEGER
  );

  CREATE TABLE IF NOT EXISTS kv_cache (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, fetched_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY, value TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    phone_number_id TEXT,
    provider TEXT,
    amount REAL,
    currency TEXT,
    direction TEXT,
    type TEXT,
    balance_after REAL,
    service_charge REAL,
    counterparty_name TEXT,
    counterparty_number TEXT,
    counterparty_available INTEGER,
    category_id TEXT,
    category_name TEXT,
    note TEXT,
    provider_reference TEXT,
    is_auto_categorized INTEGER,
    transacted_at TEXT,
    transacted_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions (transacted_at DESC, id DESC);

  CREATE TABLE IF NOT EXISTS phone_numbers (
    id TEXT PRIMARY KEY, number TEXT, provider TEXT, provider_name TEXT, display_name TEXT, is_primary INTEGER
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, type TEXT, title TEXT, body TEXT, data TEXT,
    is_read INTEGER, read_pending INTEGER DEFAULT 0, sent_at TEXT, read_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_notif_time ON notifications (sent_at DESC, id DESC);
`;

async function getKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(KEY_NAME, key);
  }
  return key;
}



export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (opening) return opening;                 // a concurrent caller is already opening → await it
  opening = (async () => {
    const key = await getKey();
    const db = await SQLite.openDatabaseAsync("tlt.db");

    await db.execAsync(`PRAGMA key = '${key}'`);
    await db.execAsync("PRAGMA busy_timeout = 3000;");

    const ver = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const v = ver?.user_version ?? 0;
    if (v < 3) await db.execAsync("DROP TABLE IF EXISTS categories;");
    if (v < 4) await db.execAsync("DROP TABLE IF EXISTS transactions;");
    if (v < 4) await db.execAsync("DROP TABLE IF EXISTS phone_numbers;");
    if (v < 5) await db.execAsync("DROP TABLE IF EXISTS notifications;");
    if (v < 5) await db.execAsync("PRAGMA user_version = 5;");

    await db.execAsync(SCHEMA);
    dbInstance = db;
    return db;
  })();
  try { return await opening; } finally { opening = null; }
}

// -- new 

// Serialize DB write-transactions so two never overlap on the one connection ("database is locked").
let dbQueue: Promise<unknown> = Promise.resolve();
export function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = dbQueue.then(fn, fn);          // run after the previous settles (ok or fail)
  dbQueue = run.then(() => {}, () => {});    // keep the chain alive regardless
  return run;
}

export async function wipeDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync("DELETE FROM categories; DELETE FROM kv_cache; DELETE FROM meta; DELETE FROM transactions; DELETE FROM phone_numbers; DELETE FROM notifications;");
}

export function closeDb(): void {
  dbInstance = null;
}
