import { PoolClient } from "pg";
import { pool } from "./db";
import { hashValue } from "./encryption";

export type OtpPurpose = "registration" | "reclaim" | "add_phone" | "password_reset";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create (or refresh) the active OTP for a (number, purpose).
 * `userId`  — set for flows that already have an account (add_phone, reset, existing-user reclaim).
 * `payload` — pending account data for flows that don't yet (registration, new-user reclaim).
 */
export async function issueChallenge(params: {
  purpose: OtpPurpose;
  phoneNumber: string;
  userId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { purpose, phoneNumber, userId, payload } = params;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO otp_challenges
       (phone_number, purpose, code_hash, user_id, payload, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (phone_number, purpose) WHERE consumed_at IS NULL
     DO UPDATE SET
       code_hash  = EXCLUDED.code_hash,
       user_id    = EXCLUDED.user_id,
       payload    = EXCLUDED.payload,
       expires_at = EXCLUDED.expires_at,
       attempts   = 0,
       created_at = NOW()`,
    [
      phoneNumber,
      purpose,
      hashValue(code),
      userId ?? null,
      payload ? JSON.stringify(payload) : null,
      expiresAt.toISOString(),
    ]
  );
   
  // Dev: log to terminal. Production: send via SMS (Africa's Talking).
  console.log(`[OTP] (${purpose}) ${phoneNumber} → ${code}`);
}

/**
 * Validate and CONSUME the active OTP, inside the caller's transaction
 * (pass the same client you do the rest of the work on, so consume is atomic).
 * Returns the challenge's user_id and payload.
 */
export async function verifyChallenge(
  client: PoolClient,
  params: { purpose: OtpPurpose; phoneNumber: string; code: string }
): Promise<{ userId: string | null; payload: any | null }> {
  const { purpose, phoneNumber, code } = params;

  const res = await client.query(
    `SELECT id, user_id, payload, code_hash, expires_at, attempts
     FROM otp_challenges
     WHERE phone_number = $1 AND purpose = $2 AND consumed_at IS NULL
     FOR UPDATE`,
    [phoneNumber, purpose]
  );
  const c = res.rows[0];

  if (!c) {
    throw Object.assign(new Error("No OTP requested for this number"), { statusCode: 400 });
  }
  if (c.attempts >= MAX_ATTEMPTS) {
    throw Object.assign(new Error("Too many attempts. Request a new code."), { statusCode: 429 });
  }
  if (new Date(c.expires_at) < new Date()) {
    throw Object.assign(new Error("OTP has expired. Request a new one."), { statusCode: 400 });
  }
  if (c.code_hash !== hashValue(code)) {
    await client.query(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`, [c.id]);
    throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });
  }

//   await client.query(`UPDATE otp_challenges SET consumed_at = NOW() WHERE id = $1`, [c.id]);
//   return { userId: c.user_id, payload: c.payload };

  // Consume the code AND scrub the sensitive payload (password hash, name) —
  // it's already captured in c.payload above and is never needed again.
  await client.query(
    `UPDATE otp_challenges
     SET consumed_at = NOW(), payload = NULL, code_hash = ''
     WHERE id = $1`,
    [c.id]
  );
  return { userId: c.user_id, payload: c.payload };
}