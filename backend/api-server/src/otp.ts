import { PoolClient } from "pg";
import { pool } from "./db";
import { hashValue } from "./encryption";
import { AppError } from "./lib/errors";
import { timingSafeEqual } from "crypto";

// export type OtpPurpose = "registration" | "reclaim" | "add_phone" | "password_reset";
export type OtpPurpose = "registration" | "reclaim" | "add_phone" | "password_reset" | "recover";


const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// ── Request throttle (per number+purpose) ──
const RESEND_COOLDOWN_MS      = 60 * 1000;       // min gap between two code requests
const REQUEST_WINDOW_MS       = 60 * 60 * 1000;  // rolling window
const MAX_REQUESTS_PER_WINDOW = 5;               // max codes per window

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function issueChallenge(params: {
  purpose: OtpPurpose;
  phoneNumber: string;
  userId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { purpose, phoneNumber, userId, payload } = params;

  // Look at the current active challenge (if any) to enforce the throttle.
  const existing = await pool.query(
    `SELECT send_count, window_started_at, last_sent_at
       FROM otp_challenges
      WHERE phone_number = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [phoneNumber, purpose]
  );

  const now = Date.now();
  let sendCount = 1;
  let windowStartedAt = new Date(now);

  const row = existing.rows[0];
  if (row) {
    // 1) Cooldown between two successive requests.
    const sinceLast = now - new Date(row.last_sent_at).getTime();
    if (sinceLast < RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
      throw new AppError("OTP_RESEND_COOLDOWN", 429, { params: { seconds } });
    }
    // 2) Rolling per-window cap.
    const windowAge = now - new Date(row.window_started_at).getTime();
    if (windowAge < REQUEST_WINDOW_MS) {
      if (row.send_count >= MAX_REQUESTS_PER_WINDOW) {
        const minutes = Math.max(1, Math.ceil((REQUEST_WINDOW_MS - windowAge) / 60000));
        throw new AppError("OTP_TOO_MANY_REQUESTS", 429, { params: { minutes } });
      }
      sendCount = row.send_count + 1;
      windowStartedAt = new Date(row.window_started_at);
    }
    // else: the window elapsed → reset (sendCount = 1, windowStartedAt = now)
  }

  const code = generateCode();
  const expiresAt = new Date(now + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO otp_challenges
       (phone_number, purpose, code_hash, user_id, payload, expires_at,
        send_count, window_started_at, last_sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (phone_number, purpose) WHERE consumed_at IS NULL
     DO UPDATE SET
       code_hash         = EXCLUDED.code_hash,
       user_id           = EXCLUDED.user_id,
       payload           = EXCLUDED.payload,
       expires_at        = EXCLUDED.expires_at,
       attempts          = 0,
       created_at        = NOW(),
       send_count        = EXCLUDED.send_count,
       window_started_at = EXCLUDED.window_started_at,
       last_sent_at      = NOW()`,
    [phoneNumber, purpose, hashValue(code), userId ?? null,
     payload ? JSON.stringify(payload) : null, expiresAt.toISOString(),
     sendCount, windowStartedAt.toISOString()]
  );

  // Dev: log to terminal. Production: send via SMS (Africa's Talking).
  console.log(`[OTP] (${purpose}) ${phoneNumber} → ${code}`);
}


// const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
// const MAX_ATTEMPTS = 5;

// function generateCode(): string {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// export async function issueChallenge(params: {
//   purpose: OtpPurpose;
//   phoneNumber: string;
//   userId?: string;
//   payload?: Record<string, unknown>;
// }): Promise<void> {
//   const { purpose, phoneNumber, userId, payload } = params;
//   const code = generateCode();
//   const expiresAt = new Date(Date.now() + OTP_TTL_MS);

//   await pool.query(
//     `INSERT INTO otp_challenges
//        (phone_number, purpose, code_hash, user_id, payload, expires_at)
//      VALUES ($1, $2, $3, $4, $5, $6)
//      ON CONFLICT (phone_number, purpose) WHERE consumed_at IS NULL
//      DO UPDATE SET
//        code_hash  = EXCLUDED.code_hash,
//        user_id    = EXCLUDED.user_id,
//        payload    = EXCLUDED.payload,
//        expires_at = EXCLUDED.expires_at,
//        attempts   = 0,
//        created_at = NOW()`,
//     [phoneNumber, purpose, hashValue(code), userId ?? null, payload ? JSON.stringify(payload) : null, expiresAt.toISOString()]
//   );

//   // Dev: log to terminal. Production: send via SMS (Africa's Talking).
//   console.log(`[OTP] (${purpose}) ${phoneNumber} → ${code}`);
// }

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

  if (!c) throw new AppError("OTP_NOT_REQUESTED", 400);
  if (c.attempts >= MAX_ATTEMPTS) throw new AppError("OTP_TOO_MANY_ATTEMPTS", 429);
  if (new Date(c.expires_at) < new Date()) throw new AppError("OTP_EXPIRED", 400);
  // Constant-time compare so response time never leaks how much of the hash matched.
  const expected = Buffer.from(c.code_hash, "hex");
  const provided = Buffer.from(hashValue(code), "hex");
  const matches = expected.length === provided.length && timingSafeEqual(expected, provided);
  if (!matches) {
    await client.query(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`, [c.id]);
    throw new AppError("OTP_INVALID", 400);
  }

  // Consume + scrub the sensitive payload (already captured in c.payload).
  await client.query(
    `UPDATE otp_challenges SET consumed_at = NOW(), payload = NULL, code_hash = '' WHERE id = $1`,
    [c.id]
  );
  return { userId: c.user_id, payload: c.payload };
}

