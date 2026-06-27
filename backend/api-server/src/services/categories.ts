import { pool } from "../db";
import { Lang } from "../lib/messages";

export async function listCategories(userId: string, lang: Lang) {
  const rows = (await pool.query(
    `SELECT id, name_en, name_so, icon, color, is_system
     FROM categories
     WHERE (user_id IS NULL OR user_id = $1)
       AND is_active = TRUE AND deleted_at IS NULL
     ORDER BY is_system DESC, name_en ASC`,
    [userId]
  )).rows;

  return rows.map((c) => ({
    id: c.id,
    name: lang === "so" ? c.name_so : c.name_en,
    icon: c.icon ?? null,
    color: c.color ?? null,
    is_system: c.is_system,
  }));
}