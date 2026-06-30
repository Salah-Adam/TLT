// // readCategories always reads local (so screens work offline), refreshCategories pulls from the API and upserts inside a transaction (all-or-nothing). Every later entity (transactions, etc.) follows this exact shape.

import { getDb } from "../db";
import { api } from "../api/client";

export type Category = { id: string; name: string; icon: string | null; color: string | null; is_system: boolean };

export async function readCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>("SELECT id, name, icon, color, is_system FROM categories ORDER BY is_system DESC, name ASC");
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, color: r.color, is_system: !!r.is_system }));
}

export async function refreshCategories(): Promise<void> {
  const fresh = await api.get<Category[]>("/api/v1/categories");
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM categories");
    for (const c of fresh) {
      await db.runAsync(
        "INSERT OR REPLACE INTO categories (id, name, icon, color, is_system) VALUES (?, ?, ?, ?, ?)",
        [c.id, c.name, c.icon ?? null, c.color ?? null, c.is_system ? 1 : 0]
      );
    }
  });
}
