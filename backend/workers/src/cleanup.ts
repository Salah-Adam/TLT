import { pool } from "./db";

/**
 * Remove deleted-transaction snapshots whose 30-day recovery window has
 * passed and that were never recovered. Recovered ones are left alone —
 * they already did their job. Hits the partial index on permanent_delete_at.
 */
export async function purgeExpiredDeletedTransactions(): Promise<number> {
  const res = await pool.query(
    `DELETE FROM deleted_transactions
     WHERE permanent_delete_at <= NOW()
       AND is_recovered = FALSE`
  );
  return res.rowCount ?? 0;
}

/**
 * Remove refresh tokens that can no longer be used — either expired
 * (past expires_at) or explicitly revoked (logout / password change).
 */
export async function purgeExpiredRefreshTokens(): Promise<number> {
  const res = await pool.query(
    `DELETE FROM refresh_tokens
     WHERE expires_at <= NOW()
        OR is_revoked = TRUE`
  );
  return res.rowCount ?? 0;
}

/** Run both sweeps and log a one-line summary. */
export async function runCleanup(): Promise<void> {
  const start = Date.now();
  const snapshots = await purgeExpiredDeletedTransactions();
  const tokens = await purgeExpiredRefreshTokens();
  console.log(
    `cleanup: removed ${snapshots} expired snapshot(s) and ${tokens} dead token(s) ` +
    `in ${Date.now() - start}ms`
  );
}