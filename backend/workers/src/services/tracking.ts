import { PoolClient } from "pg";

interface TrackingInput {
  userId: string;
  phoneHash: string | null;
  isOut: boolean;        // true = user sent (out); false = user received (in)
  amount: number;
  transactedAt: string;  // ISO UTC instant
}

/**
 * If the transaction's counterparty matches a tracked number for this user,
 * roll the amount into that number's totals and its parent contact's totals.
 * Returns true if a match was counted. No decryption — matching is hash-only.
 */
export async function updateTrackedContact(client: PoolClient, t: TrackingInput): Promise<boolean> {
  if (!t.phoneHash) return false; // no counterparty number to match on

  const match = await client.query(
    `SELECT tcn.id AS number_id, tc.id AS contact_id, tc.tracking_direction
     FROM tracked_contact_numbers tcn
     JOIN tracked_contacts tc ON tc.id = tcn.contact_id
     WHERE tcn.user_id = $1
       AND tcn.tracked_number_hash = $2
       AND tcn.is_active = TRUE
       AND tc.is_active = TRUE
       AND tc.deleted_at IS NULL`,
    [t.userId, t.phoneHash]
  );

  if (match.rowCount === 0) return false; // not a tracked contact (the common case)

  const { number_id, contact_id, tracking_direction } = match.rows[0];

  // Honor the contact's direction preference.
  const dir = t.isOut ? "sent" : "received";
  if (tracking_direction !== "both" && tracking_direction !== dir) return false;

  const sentDelta = t.isOut ? t.amount : 0;
  const recvDelta = t.isOut ? 0 : t.amount;

  // Per-number totals.
  await client.query(
    `UPDATE tracked_contact_numbers
     SET total_sent = total_sent + $1,
         total_received = total_received + $2,
         transaction_count = transaction_count + 1,
         last_transaction_at = $3
     WHERE id = $4`,
    [sentDelta, recvDelta, t.transactedAt, number_id]
  );

  // Parent contact's aggregate totals.
  await client.query(
    `UPDATE tracked_contacts
     SET total_sent = total_sent + $1,
         total_received = total_received + $2,
         transaction_count = transaction_count + 1,
         last_transaction_at = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [sentDelta, recvDelta, t.transactedAt, contact_id]
  );

  return true;
}