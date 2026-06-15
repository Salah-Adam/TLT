import { pool } from "./db";
import { runCleanup } from "./cleanup";

async function main() {
  const suffix = Date.now();
  let userId: string | undefined;

  try {
    const u = await pool.query(
      `INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id`,
      [`t_${suffix}`, `t_${suffix}@ex.com`, "x"]
    );
    userId = u.rows[0].id;

    // deleted_transactions: 1 to purge, 2 to keep
    await pool.query(
      `INSERT INTO deleted_transactions (id, original_data, phone_number_id, user_id, permanent_delete_at)
       VALUES (gen_random_uuid(), '{"n":1}'::jsonb, gen_random_uuid(), $1, NOW() - INTERVAL '1 day')`, [userId]); // expired, not recovered -> PURGE
    await pool.query(
      `INSERT INTO deleted_transactions (id, original_data, phone_number_id, user_id, permanent_delete_at)
       VALUES (gen_random_uuid(), '{"n":2}'::jsonb, gen_random_uuid(), $1, NOW() + INTERVAL '10 days')`, [userId]); // future -> KEEP
    await pool.query(
      `INSERT INTO deleted_transactions (id, original_data, phone_number_id, user_id, permanent_delete_at, is_recovered, recovered_at)
       VALUES (gen_random_uuid(), '{"n":3}'::jsonb, gen_random_uuid(), $1, NOW() - INTERVAL '1 day', TRUE, NOW())`, [userId]); // expired but recovered -> KEEP

    // refresh_tokens: 2 to purge, 1 to keep
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, is_revoked)
       VALUES ($1, $2, NOW() - INTERVAL '10 days', NOW() - INTERVAL '40 days', FALSE)`, [userId, `expired_${suffix}`]); // expired -> PURGE
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked)
       VALUES ($1, $2, NOW() + INTERVAL '20 days', TRUE)`, [userId, `revoked_${suffix}`]); // revoked -> PURGE
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked)
       VALUES ($1, $2, NOW() + INTERVAL '20 days', FALSE)`, [userId, `valid_${suffix}`]); // valid -> KEEP

    console.log("Seeded 3 snapshots (1 expired) and 3 tokens (2 dead). Running cleanup...");
    await runCleanup();

    const dt = await pool.query(`SELECT count(*)::int AS n FROM deleted_transactions WHERE user_id=$1`, [userId]);
    const rt = await pool.query(`SELECT count(*)::int AS n FROM refresh_tokens WHERE user_id=$1`, [userId]);
    console.log("snapshots remaining:", dt.rows[0].n, dt.rows[0].n === 2 ? "✓ (future + recovered kept)" : "✗");
    console.log("tokens remaining:", rt.rows[0].n, rt.rows[0].n === 1 ? "✓ (only the valid one kept)" : "✗");
  } finally {
    if (userId) {
      await pool.query(`DELETE FROM deleted_transactions WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((e) => { console.error("cleanup test FAILED:", e); process.exit(1); });