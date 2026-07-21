import { pool } from "../src/db";

// Reference data preserved across resets: providers AND the 24 seeded categories.
// We can't simply exclude `categories` from a TRUNCATE, because categories.user_id
// references users and TRUNCATE users CASCADE would wipe it. So we truncate every
// OTHER data table, then DELETE FROM users — which succeeds because no category
// points at a user (custom categories are deferred; user_id is always NULL).
const KEEP = ["migrations", "providers", "categories", "users"];

export async function resetDb(): Promise<void> {
  const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  const targets = rows.map((r) => r.tablename).filter((t) => !KEEP.includes(t));
  if (targets.length > 0) {
    const list = targets.map((t) => `"${t}"`).join(", ");
    await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  }
  await pool.query(`DELETE FROM users`); // not TRUNCATE — avoids cascading into categories
}

// -----------

// import { pool } from "../src/db";

// // Tables holding seeded reference data — must survive between tests.
// // (`migrations` only exists in the real DB, harmless to list.)
// const KEEP = ["migrations", "providers", "categories"];

// /** Empty every data table so each test starts from a known-clean state. */
// export async function resetDb(): Promise<void> {
//   const { rows } = await pool.query(
//     `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
//   );
//   const targets = rows.map((r) => r.tablename).filter((t) => !KEEP.includes(t));
//   if (targets.length === 0) return;
//   const list = targets.map((t) => `"${t}"`).join(", ");
//   await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
// }