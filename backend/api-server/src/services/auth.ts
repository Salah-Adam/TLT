import crypto from "crypto";
import argon2 from "argon2";
import { PoolClient } from "pg";
import { pool } from "../db";
import { config } from "../config";
import { createUserDek } from "../encryption";
import { JwtSigner } from "../types/jwt";
import { detectProvider } from "../utils/phone";
import { issueChallenge, verifyChallenge } from "../otp";
import { AppError } from "../lib/errors";

// ── Refresh-token helpers ────────────────────────────────────────

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function userLang(userId: string): Promise<"en" | "so"> {
  const r = await pool.query(`SELECT language FROM users WHERE id = $1`, [userId]);
  return r.rows[0]?.language === "en" ? "en" : "so";
}

/** Single-session: revoke all previous tokens, then issue a fresh pair. */
async function issueTokens(
  userId: string,
  signJwt: JwtSigner,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  await pool.query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`, [userId]);

  const { raw, hash } = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hash, deviceInfo ?? null, ipAddress ?? null, expiresAt.toISOString()]
  );

  const lang = await userLang(userId);
  const accessToken = signJwt({ sub: userId, type: "access", lang }, { expiresIn: config.jwt.accessExpiresIn });
  return { accessToken, refreshToken: raw };
}

// ── Ownership transfer (shared by all reclaim flows) ─────────────

async function transferNumberToUser(
  client: PoolClient,
  params: { number: string; newUserId: string; makePrimary: boolean }
): Promise<{ phoneNumberId: string; webhookToken: string | null; previousOwnerId: string }> {
  const { number, newUserId, makePrimary } = params;

  const provider = detectProvider(number);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const current = await client.query(
    `SELECT id, user_id, is_primary, webhook_token FROM phone_numbers
     WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL
     FOR UPDATE`,
    [number]
  );
  if (current.rowCount === 0) throw new AppError("NUMBER_NOT_ACTIVE", 404);

  const old = current.rows[0];
  if (old.user_id === newUserId) throw new AppError("ALREADY_OWN_NUMBER", 409);

  const previousOwnerId: string = old.user_id;
  const carriedToken: string | null = old.webhook_token;

  await client.query(
    `UPDATE phone_numbers
     SET is_active = FALSE, is_primary = FALSE, webhook_token = NULL, updated_at = NOW()
     WHERE id = $1`,
    [old.id]
  );

  if (old.is_primary) {
    await client.query(
      `UPDATE phone_numbers SET is_primary = TRUE, updated_at = NOW()
       WHERE id = (
         SELECT id FROM phone_numbers
         WHERE user_id = $1 AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY created_at ASC LIMIT 1
       )`,
      [previousOwnerId]
    );
  }

  const inserted = await client.query(
    `INSERT INTO phone_numbers
       (user_id, number, provider, is_primary, is_active, webhook_token, previous_user_id, reclaimed_at)
     VALUES ($1, $2, $3, $4, TRUE, $5, $6, NOW())
     RETURNING id`,
    [newUserId, number, provider, makePrimary, carriedToken, previousOwnerId]
  );

  await client.query(
    `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
     VALUES ($1, 'number_reclaimed', $2, $3, $4, $5, $6)`,
    [
      previousOwnerId,
      "Phone Number Reclaimed",
      "Lambarka Taleefanka Ayaa La Qaatay",
      `The number ${number} has been reclaimed by its owner. You keep your past transactions but will no longer receive new ones for this number.`,
      `Lambarka ${number} ayaa dib loo qaatay. Waxaad heysataa wax-ku-dhaqaaqyadii hore, laakiin mar dambe ma heli doontid kuwa cusub ee lambarkan.`,
      JSON.stringify({ number }),
    ]
  );

  return { phoneNumberId: inserted.rows[0].id, webhookToken: carriedToken, previousOwnerId };
}

// ── Register ─────────────────────────────────────────────────────

export interface RegisterInput {
  fullName: string;
  phoneNumber: string;
  password: string;
  language?: string;
}

export async function register(input: RegisterInput): Promise<{ phoneNumber: string }> {
  const { fullName, phoneNumber, password, language = "so" } = input;

  const provider = detectProvider(phoneNumber);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const active = await pool.query(
    `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [phoneNumber]
  );
  if (active.rowCount && active.rowCount > 0) throw new AppError("PHONE_ALREADY_REGISTERED", 409);

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await issueChallenge({
    purpose: "registration",
    phoneNumber,
    payload: { fullName, passwordHash, language, provider },
  });

  return { phoneNumber };
}

export async function verifyRegistrationOtp(
  phoneNumber: string,
  otp: string,
  signJwt: JwtSigner,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const client = await pool.connect();
  let userId: string;
  let provider: string;

  try {
    await client.query("BEGIN");

    const { payload } = await verifyChallenge(client, { purpose: "registration", phoneNumber, code: otp });
    const { fullName, passwordHash, language } = payload;
    provider = payload.provider;

    const soft = await client.query(
      `SELECT id FROM users WHERE phone_number = $1 AND deleted_at IS NOT NULL`,
      [phoneNumber]
    );
    if (soft.rowCount && soft.rowCount > 0) {
      const r = await client.query(
        `UPDATE users SET full_name=$1, password_hash=$2, language=$3,
               deleted_at=NULL, is_active=TRUE, updated_at=NOW()
         WHERE id=$4 RETURNING id`,
        [fullName, passwordHash, language, soft.rows[0].id]
      );
      userId = r.rows[0].id;
    } else {
      const r = await client.query(
        `INSERT INTO users (full_name, phone_number, password_hash, language)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [fullName, phoneNumber, passwordHash, language]
      );
      userId = r.rows[0].id;
    }

    const webhookToken = crypto.randomBytes(32).toString("hex");
    await client.query(
      `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
       VALUES ($1,$2,$3,TRUE,TRUE,$4)`,
      [userId, phoneNumber, provider, webhookToken]
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const dek = await pool.query(`SELECT id FROM user_encryption_keys WHERE user_id = $1`, [userId!]);
  if (!dek.rowCount || dek.rowCount === 0) {
    try {
      await createUserDek(userId!);
    } catch (e) {
      await pool.query(`DELETE FROM phone_numbers WHERE user_id = $1`, [userId!]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId!]);
      throw new AppError("ACCOUNT_CREATION_FAILED", 500);
    }
  }

  return issueTokens(userId!, signJwt, deviceInfo, ipAddress);
}

// ── Login ─────────────────────────────────────────────────────────

export interface LoginInput {
  phoneNumber: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export async function login(
  input: LoginInput,
  signJwt: JwtSigner
): Promise<{ accessToken: string; refreshToken: string }> {
  const { phoneNumber, password, deviceInfo, ipAddress } = input;

  const userResult = await pool.query(
    `SELECT u.id, u.password_hash, u.is_active, u.deleted_at
     FROM users u
     JOIN phone_numbers pn ON pn.user_id = u.id
     WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL`,
    [phoneNumber]
  );
  const user = userResult.rows[0];

  const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhash";
  const valid = await argon2.verify(user ? user.password_hash : dummyHash, password);

  if (!user || !valid) throw new AppError("INVALID_CREDENTIALS", 401);
  if (user.deleted_at) throw new AppError("ACCOUNT_NOT_FOUND", 401);
  if (!user.is_active) throw new AppError("ACCOUNT_DISABLED", 403);

  return issueTokens(user.id, signJwt, deviceInfo, ipAddress);
}

// ── Forgot / reset password ───────────────────────────────────────

export async function forgotPassword(phoneNumber: string): Promise<void> {
  const r = await pool.query(
    `SELECT u.id FROM users u
     JOIN phone_numbers pn ON pn.user_id = u.id
     WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL`,
    [phoneNumber]
  );
  if (r.rowCount && r.rowCount > 0) {
    await issueChallenge({ purpose: "password_reset", phoneNumber, userId: r.rows[0].id });
  }
}

export async function resetPassword(
  phoneNumber: string,
  otp: string,
  newPassword: string,
  signJwt: JwtSigner,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const client = await pool.connect();
  let userId: string;
  try {
    await client.query("BEGIN");
    const { userId: uid } = await verifyChallenge(client, { purpose: "password_reset", phoneNumber, code: otp });
    if (!uid) throw new AppError("RESET_SESSION_NOT_FOUND", 400);
    userId = uid;

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await client.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [passwordHash, userId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return issueTokens(userId!, signJwt, deviceInfo, ipAddress);
}

// ── Refresh / logout ──────────────────────────────────────────────

export async function refresh(rawToken: string, signJwt: JwtSigner): Promise<{ accessToken: string }> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const result = await pool.query(
    `SELECT id, user_id, expires_at, is_revoked, created_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  const token = result.rows[0];

  if (!token) throw new AppError("REFRESH_INVALID", 401);
  if (token.is_revoked) throw new AppError("REFRESH_REVOKED", 401);
  if (new Date(token.expires_at) < new Date()) throw new AppError("REFRESH_EXPIRED", 401);

  const absoluteExpiry = new Date(token.created_at);
  absoluteExpiry.setDate(absoluteExpiry.getDate() + config.jwt.refreshAbsoluteDays);
  if (absoluteExpiry < new Date()) throw new AppError("SESSION_MAX_LIFETIME", 401);

  const slidingExpiry = new Date();
  slidingExpiry.setDate(slidingExpiry.getDate() + 30);
  const newExpiry = slidingExpiry < absoluteExpiry ? slidingExpiry : absoluteExpiry;

  await pool.query(`UPDATE refresh_tokens SET expires_at=$1, last_used_at=NOW() WHERE id=$2`, [newExpiry.toISOString(), token.id]);

  const lang = await userLang(token.user_id);
  const accessToken = signJwt({ sub: token.user_id, type: "access", lang }, { expiresIn: config.jwt.accessExpiresIn });
  return { accessToken };
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
}

// ── Reclaim — public (brand-new user, password required) ──────────

export interface ReclaimRequestInput {
  fullName: string;
  phoneNumber: string;
  password: string;
  language?: string;
}

export async function reclaimRequest(input: ReclaimRequestInput): Promise<{ phoneNumber: string }> {
  const { fullName, phoneNumber, password, language = "so" } = input;

  const active = await pool.query(
    `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [phoneNumber]
  );
  if (!active.rowCount || active.rowCount === 0) throw new AppError("NUMBER_NOT_REGISTERED_REGISTER", 400);

  const provider = detectProvider(phoneNumber);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await issueChallenge({
    purpose: "reclaim",
    phoneNumber,
    payload: { fullName, passwordHash, language, provider },
  });

  return { phoneNumber };
}

export async function reclaimVerify(
  phoneNumber: string,
  otp: string,
  signJwt: JwtSigner,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const client = await pool.connect();
  let newUserId: string;
  try {
    await client.query("BEGIN");
    const { payload } = await verifyChallenge(client, { purpose: "reclaim", phoneNumber, code: otp });
    if (!payload) throw new AppError("NO_PENDING_RECLAIM", 400);

    const { fullName, passwordHash, language } = payload;
    const r = await client.query(
      `INSERT INTO users (full_name, phone_number, password_hash, language)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [fullName, phoneNumber, passwordHash, language]
    );
    newUserId = r.rows[0].id;
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  try {
    await createUserDek(newUserId!);
  } catch (e) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [newUserId!]);
    throw new AppError("ACCOUNT_CREATION_FAILED", 500);
  }

  const client2 = await pool.connect();
  try {
    await client2.query("BEGIN");
    await transferNumberToUser(client2, { number: phoneNumber, newUserId: newUserId!, makePrimary: true });
    await client2.query("COMMIT");
  } catch (e) {
    await client2.query("ROLLBACK");
    throw e;
  } finally {
    client2.release();
  }

  return issueTokens(newUserId!, signJwt, deviceInfo, ipAddress);
}

// ── Reclaim — existing user adds someone else's number (no password) ──

export async function reclaimNumberRequest(input: {
  userId: string;
  number: string;
}): Promise<{ message: string }> {
  const { userId, number } = input;

  const current = await pool.query(
    `SELECT user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [number]
  );
  if (!current.rowCount || current.rowCount === 0) throw new AppError("NUMBER_NOT_REGISTERED_ADD", 400);
  if (current.rows[0].user_id === userId) throw new AppError("ALREADY_OWN_NUMBER", 409);

  await issueChallenge({ purpose: "reclaim", phoneNumber: number, userId });
  return { message: "ok" };
}

export async function reclaimNumberVerify(input: {
  userId: string;
  number: string;
  otp: string;
}): Promise<{ webhookToken: string | null }> {
  const { userId, number, otp } = input;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { userId: challengeUserId } = await verifyChallenge(client, { purpose: "reclaim", phoneNumber: number, code: otp });
    if (challengeUserId !== userId) throw new AppError("OTP_WRONG_ACCOUNT", 400);

    const { webhookToken } = await transferNumberToUser(client, { number, newUserId: userId, makePrimary: false });
    await client.query("COMMIT");
    return { webhookToken };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}



// ------------------------------

// import crypto from "crypto";
// import argon2 from "argon2";
// import { PoolClient } from "pg";
// import { pool } from "../db";
// import { config } from "../config";
// import { createUserDek } from "../encryption";
// import { JwtSigner } from "../types/jwt";
// import { detectProvider } from "../utils/phone";
// import { issueChallenge, verifyChallenge } from "../otp";

// // ── Refresh-token helpers ────────────────────────────────────────

// function generateRefreshToken(): { raw: string; hash: string } {
//   const raw = crypto.randomBytes(48).toString("base64url");
//   const hash = crypto.createHash("sha256").update(raw).digest("hex");
//   return { raw, hash };
// }

// /** Single-session: revoke all previous tokens, then issue a fresh pair. */
// async function issueTokens(
//   userId: string,
//   signJwt: JwtSigner,
//   deviceInfo?: string,
//   ipAddress?: string
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   await pool.query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`, [userId]);

//   const { raw, hash } = generateRefreshToken();
//   const expiresAt = new Date();
//   expiresAt.setDate(expiresAt.getDate() + 30);

//   await pool.query(
//     `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
//      VALUES ($1, $2, $3, $4, $5)`,
//     [userId, hash, deviceInfo ?? null, ipAddress ?? null, expiresAt.toISOString()]
//   );

//   // const accessToken = signJwt({ sub: userId, type: "access" }, { expiresIn: config.jwt.accessExpiresIn });
//   // return { accessToken, refreshToken: raw };
//   const langRow = await pool.query(`SELECT language FROM users WHERE id = $1`, [userId]);
//   const lang: "en" | "so" = langRow.rows[0]?.language === "en" ? "en" : "so";
//   const accessToken = signJwt({ sub: userId, type: "access", lang }, { expiresIn: config.jwt.accessExpiresIn });
//   return { accessToken, refreshToken: raw };
// }

// // ── Ownership transfer (shared by all reclaim flows) ─────────────

// /**
//  * Move active ownership of `number` to `newUserId`.
//  * Deactivates the previous owner's row (kept for their history), carries the
//  * SAME webhook_token over (option b — telecom needs no reconfiguration),
//  * reassigns their primary if needed, and notifies them. Caller owns the tx.
//  */
// async function transferNumberToUser(
//   client: PoolClient,
//   params: { number: string; newUserId: string; makePrimary: boolean }
// ): Promise<{ phoneNumberId: string; webhookToken: string | null; previousOwnerId: string }> {
//   const { number, newUserId, makePrimary } = params;

//   const provider = detectProvider(number);
//   if (!provider) {
//     throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });
//   }

//   const current = await client.query(
//     `SELECT id, user_id, is_primary, webhook_token FROM phone_numbers
//      WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL
//      FOR UPDATE`,
//     [number]
//   );
//   if (current.rowCount === 0) {
//     throw Object.assign(new Error("This number is not active on any account."), { statusCode: 404 });
//   }
//   const old = current.rows[0];
//   if (old.user_id === newUserId) {
//     throw Object.assign(new Error("You already own this number."), { statusCode: 409 });
//   }
//   const previousOwnerId: string = old.user_id;
//   const carriedToken: string | null = old.webhook_token;

//   // Deactivate old row + DETACH its token (webhook_token is UNIQUE).
//   await client.query(
//     `UPDATE phone_numbers
//      SET is_active = FALSE, is_primary = FALSE, webhook_token = NULL, updated_at = NOW()
//      WHERE id = $1`,
//     [old.id]
//   );

//   // Reassign previous owner's primary if the reclaimed number was it.
//   if (old.is_primary) {
//     await client.query(
//       `UPDATE phone_numbers SET is_primary = TRUE, updated_at = NOW()
//        WHERE id = (
//          SELECT id FROM phone_numbers
//          WHERE user_id = $1 AND is_active = TRUE AND deleted_at IS NULL
//          ORDER BY created_at ASC LIMIT 1
//        )`,
//       [previousOwnerId]
//     );
//   }

//   // New active row for the reclaimer — reuse the SAME token.
//   const inserted = await client.query(
//     `INSERT INTO phone_numbers
//        (user_id, number, provider, is_primary, is_active, webhook_token, previous_user_id, reclaimed_at)
//      VALUES ($1, $2, $3, $4, TRUE, $5, $6, NOW())
//      RETURNING id`,
//     [newUserId, number, provider, makePrimary, carriedToken, previousOwnerId]
//   );

//   // Notify the previous owner.
//   await client.query(
//     `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
//      VALUES ($1, 'number_reclaimed', $2, $3, $4, $5, $6)`,
//     [
//       previousOwnerId,
//       "Phone Number Reclaimed",
//       "Lambarka Taleefanka Ayaa La Qaatay",
//       `The number ${number} has been reclaimed by its owner. You keep your past transactions but will no longer receive new ones for this number.`,
//       `Lambarka ${number} ayaa dib loo qaatay. Waxaad heysataa wax-ku-dhaqaaqyadii hore, laakiin mar dambe ma heli doontid kuwa cusub ee lambarkan.`,
//       JSON.stringify({ number }),
//     ]
//   );

//   return { phoneNumberId: inserted.rows[0].id, webhookToken: carriedToken, previousOwnerId };
// }

// // ── Register ─────────────────────────────────────────────────────

// export interface RegisterInput {
//   fullName: string;
//   phoneNumber: string;
//   password: string;
//   language?: string;
// }

// /** Step 1 — stage the signup as an OTP challenge. No users/phone_numbers row yet. */
// export async function register(input: RegisterInput): Promise<{ phoneNumber: string }> {
//   const { fullName, phoneNumber, password, language = "so" } = input;

//   const provider = detectProvider(phoneNumber);
//   if (!provider) {
//     throw Object.assign(
//       new Error("Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) numbers are supported."),
//       { statusCode: 400 }
//     );
//   }

//   const active = await pool.query(
//     `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
//     [phoneNumber]
//   );
//   if (active.rowCount && active.rowCount > 0) {
//     throw Object.assign(
//       new Error("Phone number already registered. If this is your number, use the reclaim option."),
//       { statusCode: 409 }
//     );
//   }

//   const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
//   await issueChallenge({
//     purpose: "registration",
//     phoneNumber,
//     payload: { fullName, passwordHash, language, provider },
//   });

//   return { phoneNumber };
// }

// /** Step 2 — verify, then create user + phone_numbers + DEK, issue tokens. */
// export async function verifyRegistrationOtp(
//   phoneNumber: string,
//   otp: string,
//   signJwt: JwtSigner,
//   deviceInfo?: string,
//   ipAddress?: string
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   const client = await pool.connect();
//   let userId: string;
//   let provider: string;

//   try {
//     await client.query("BEGIN");

//     const { payload } = await verifyChallenge(client, { purpose: "registration", phoneNumber, code: otp });
//     const { fullName, passwordHash, language } = payload;
//     provider = payload.provider;

//     const soft = await client.query(
//       `SELECT id FROM users WHERE phone_number = $1 AND deleted_at IS NOT NULL`,
//       [phoneNumber]
//     );
//     if (soft.rowCount && soft.rowCount > 0) {
//       const r = await client.query(
//         `UPDATE users SET full_name=$1, password_hash=$2, language=$3,
//                deleted_at=NULL, is_active=TRUE, updated_at=NOW()
//          WHERE id=$4 RETURNING id`,
//         [fullName, passwordHash, language, soft.rows[0].id]
//       );
//       userId = r.rows[0].id;
//     } else {
//       const r = await client.query(
//         `INSERT INTO users (full_name, phone_number, password_hash, language)
//          VALUES ($1,$2,$3,$4) RETURNING id`,
//         [fullName, phoneNumber, passwordHash, language]
//       );
//       userId = r.rows[0].id;
//     }

//     const webhookToken = crypto.randomBytes(32).toString("hex");
//     await client.query(
//       `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
//        VALUES ($1,$2,$3,TRUE,TRUE,$4)`,
//       [userId, phoneNumber, provider, webhookToken]
//     );

//     await client.query("COMMIT");
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }

//   // DEK (external KMS) — outside the tx. Compensate on failure.
//   const dek = await pool.query(`SELECT id FROM user_encryption_keys WHERE user_id = $1`, [userId!]);
//   if (!dek.rowCount || dek.rowCount === 0) {
//     try {
//       await createUserDek(userId!);
//     } catch (e) {
//       await pool.query(`DELETE FROM phone_numbers WHERE user_id = $1`, [userId!]);
//       await pool.query(`DELETE FROM users WHERE id = $1`, [userId!]);
//       throw Object.assign(new Error("Account creation failed. Please try again."), { statusCode: 500 });
//     }
//   }

//   return issueTokens(userId!, signJwt, deviceInfo, ipAddress);
// }

// // ── Login ─────────────────────────────────────────────────────────

// export interface LoginInput {
//   phoneNumber: string;
//   password: string;
//   deviceInfo?: string;
//   ipAddress?: string;
// }

// /** Resolve the CURRENT owner through the active phone_numbers row. */
// export async function login(
//   input: LoginInput,
//   signJwt: JwtSigner
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   const { phoneNumber, password, deviceInfo, ipAddress } = input;

//   const userResult = await pool.query(
//     `SELECT u.id, u.password_hash, u.is_active, u.deleted_at
//      FROM users u
//      JOIN phone_numbers pn ON pn.user_id = u.id
//      WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL`,
//     [phoneNumber]
//   );
//   const user = userResult.rows[0];

//   const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhash";
//   const valid = await argon2.verify(user ? user.password_hash : dummyHash, password);

//   if (!user || !valid) {
//     throw Object.assign(new Error("Invalid phone number or password"), { statusCode: 401 });
//   }
//   if (user.deleted_at) {
//     throw Object.assign(new Error("Account not found"), { statusCode: 401 });
//   }
//   if (!user.is_active) {
//     throw Object.assign(new Error("Account is disabled"), { statusCode: 403 });
//   }

//   return issueTokens(user.id, signJwt, deviceInfo, ipAddress);
// }

// // ── Forgot / reset password ───────────────────────────────────────

// export async function forgotPassword(phoneNumber: string): Promise<void> {
//   const r = await pool.query(
//     `SELECT u.id FROM users u
//      JOIN phone_numbers pn ON pn.user_id = u.id
//      WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.deleted_at IS NULL`,
//     [phoneNumber]
//   );
//   // Anti-enumeration: only send if found; route always returns the same message.
//   if (r.rowCount && r.rowCount > 0) {
//     await issueChallenge({ purpose: "password_reset", phoneNumber, userId: r.rows[0].id });
//   }
// }

// export async function resetPassword(
//   phoneNumber: string,
//   otp: string,
//   newPassword: string,
//   signJwt: JwtSigner,
//   deviceInfo?: string,
//   ipAddress?: string
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   const client = await pool.connect();
//   let userId: string;
//   try {
//     await client.query("BEGIN");
//     const { userId: uid } = await verifyChallenge(client, { purpose: "password_reset", phoneNumber, code: otp });
//     if (!uid) throw Object.assign(new Error("Reset session not found"), { statusCode: 400 });
//     userId = uid;

//     const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
//     await client.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [passwordHash, userId]);
//     await client.query("COMMIT");
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }

//   return issueTokens(userId!, signJwt, deviceInfo, ipAddress);
// }

// // ── Refresh / logout ──────────────────────────────────────────────

// export async function refresh(rawToken: string, signJwt: JwtSigner): Promise<{ accessToken: string }> {
//   const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
//   const result = await pool.query(
//     `SELECT id, user_id, expires_at, is_revoked, created_at FROM refresh_tokens WHERE token_hash = $1`,
//     [tokenHash]
//   );
//   const token = result.rows[0];

//   if (!token) throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401 });
//   if (token.is_revoked) throw Object.assign(new Error("Refresh token has been revoked"), { statusCode: 401 });
//   if (new Date(token.expires_at) < new Date()) throw Object.assign(new Error("Refresh token has expired"), { statusCode: 401 });

//   const absoluteExpiry = new Date(token.created_at);
//   absoluteExpiry.setDate(absoluteExpiry.getDate() + config.jwt.refreshAbsoluteDays);
//   if (absoluteExpiry < new Date()) {
//     throw Object.assign(new Error("Session has exceeded maximum lifetime, please log in again"), { statusCode: 401 });
//   }

//   const slidingExpiry = new Date();
//   slidingExpiry.setDate(slidingExpiry.getDate() + 30);
//   const newExpiry = slidingExpiry < absoluteExpiry ? slidingExpiry : absoluteExpiry;

//   await pool.query(`UPDATE refresh_tokens SET expires_at=$1, last_used_at=NOW() WHERE id=$2`, [newExpiry.toISOString(), token.id]);

//   // const accessToken = signJwt({ sub: token.user_id, type: "access" }, { expiresIn: config.jwt.accessExpiresIn });
//   // return { accessToken };
//   const langRow = await pool.query(`SELECT language FROM users WHERE id = $1`, [token.user_id]);
//   const lang: "en" | "so" = langRow.rows[0]?.language === "en" ? "en" : "so";
//   const accessToken = signJwt({ sub: token.user_id, type: "access", lang }, { expiresIn: config.jwt.accessExpiresIn });
//   return { accessToken };
// }

// export async function logout(rawToken: string): Promise<void> {
//   const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
//   await pool.query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
// }

// // ── Reclaim — public (brand-new user, password required) ──────────

// export interface ReclaimRequestInput {
//   fullName: string;
//   phoneNumber: string;
//   password: string;
//   language?: string;
// }

// export async function reclaimRequest(input: ReclaimRequestInput): Promise<{ phoneNumber: string }> {
//   const { fullName, phoneNumber, password, language = "so" } = input;

//   const active = await pool.query(
//     `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
//     [phoneNumber]
//   );
//   if (!active.rowCount || active.rowCount === 0) {
//     throw Object.assign(new Error("This number isn't registered to anyone. Please register instead."), { statusCode: 400 });
//   }

//   const provider = detectProvider(phoneNumber);
//   if (!provider) throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });

//   const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
//   await issueChallenge({
//     purpose: "reclaim",
//     phoneNumber,
//     payload: { fullName, passwordHash, language, provider },
//   });

//   return { phoneNumber };
// }

// export async function reclaimVerify(
//   phoneNumber: string,
//   otp: string,
//   signJwt: JwtSigner,
//   deviceInfo?: string,
//   ipAddress?: string
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   // A) Verify + create the new account (no ownership change yet).
//   const client = await pool.connect();
//   let newUserId: string;
//   try {
//     await client.query("BEGIN");
//     const { payload } = await verifyChallenge(client, { purpose: "reclaim", phoneNumber, code: otp });
//     if (!payload) {
//       throw Object.assign(new Error("No pending reclaim registration. Please start again."), { statusCode: 400 });
//     }
//     const { fullName, passwordHash, language } = payload;
//     const r = await client.query(
//       `INSERT INTO users (full_name, phone_number, password_hash, language)
//        VALUES ($1,$2,$3,$4) RETURNING id`,
//       [fullName, phoneNumber, passwordHash, language]
//     );
//     newUserId = r.rows[0].id;
//     await client.query("COMMIT");
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }

//   // B) DEK before mutating ownership — if KMS fails, drop the new account; previous owner untouched.
//   try {
//     await createUserDek(newUserId!);
//   } catch (e) {
//     await pool.query(`DELETE FROM users WHERE id = $1`, [newUserId!]);
//     throw Object.assign(new Error("Account creation failed. Please try again."), { statusCode: 500 });
//   }

//   // C) Transfer ownership.
//   const client2 = await pool.connect();
//   try {
//     await client2.query("BEGIN");
//     await transferNumberToUser(client2, { number: phoneNumber, newUserId: newUserId!, makePrimary: true });
//     await client2.query("COMMIT");
//   } catch (e) {
//     await client2.query("ROLLBACK");
//     throw e;
//   } finally {
//     client2.release();
//   }

//   return issueTokens(newUserId!, signJwt, deviceInfo, ipAddress);
// }

// // ── Reclaim — existing user adds someone else's number (no password) ──

// export async function reclaimNumberRequest(input: {
//   userId: string;
//   number: string;
// }): Promise<{ message: string }> {
//   const { userId, number } = input;

//   const current = await pool.query(
//     `SELECT user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
//     [number]
//   );
//   if (!current.rowCount || current.rowCount === 0) {
//     throw Object.assign(new Error("This number isn't registered to anyone — add it normally instead."), { statusCode: 400 });
//   }
//   if (current.rows[0].user_id === userId) {
//     throw Object.assign(new Error("You already own this number."), { statusCode: 409 });
//   }

//   await issueChallenge({ purpose: "reclaim", phoneNumber: number, userId });
//   return { message: "OTP sent to the number you are reclaiming" };
// }

// export async function reclaimNumberVerify(input: {
//   userId: string;
//   number: string;
//   otp: string;
// }): Promise<{ webhookToken: string | null }> {
//   const { userId, number, otp } = input;

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const { userId: challengeUserId } = await verifyChallenge(client, { purpose: "reclaim", phoneNumber: number, code: otp });
//     if (challengeUserId !== userId) {
//       throw Object.assign(new Error("This code was not issued for your account."), { statusCode: 400 });
//     }
//     const { webhookToken } = await transferNumberToUser(client, { number, newUserId: userId, makePrimary: false });
//     await client.query("COMMIT");
//     return { webhookToken };
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// }
