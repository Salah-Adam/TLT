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
import { enqueueStoredPush } from "../queue";


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
): Promise<{ phoneNumberId: string; webhookToken: string | null; previousOwnerId: string; reclaimNotificationId: string }> {
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

  // const old = current.rows[0];
  const previousOwnerId: string = old.user_id;
  if (previousOwnerId === newUserId) throw new AppError("ALREADY_OWN_NUMBER", 409); // can't reclaim your own active number
  const carriedToken: string | null = old.webhook_token;

  // const previousOwnerId: string = old.user_id;
  // const carriedToken: string | null = old.webhook_token;

  // Retire the reclaimed number for the previous owner.
  await client.query(
    `UPDATE phone_numbers
     SET is_active = FALSE, is_primary = FALSE, webhook_token = NULL,
         reclaimed_by = $2, updated_at = NOW()
     WHERE id = $1`,
    [old.id, newUserId]
  );

  // If it was their primary, promote their oldest remaining active number.
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

  // Does the previous owner have any active number left?
  const remaining = (await client.query(
    `SELECT COUNT(*)::int AS n FROM phone_numbers
     WHERE user_id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [previousOwnerId]
  )).rows[0].n as number;
  const previousOwnerDeactivated = remaining === 0;

  // Their new primary (used to tell them how to sign in now).
  let newPrimaryNumber: string | null = null;
  if (!previousOwnerDeactivated) {
    const p = await client.query(
      `SELECT number FROM phone_numbers
       WHERE user_id = $1 AND is_active = TRUE AND is_primary = TRUE AND deleted_at IS NULL LIMIT 1`,
      [previousOwnerId]
    );
    newPrimaryNumber = p.rows[0]?.number ?? null;
  }

  // Keep the previous owner's identity number in sync when they still have one.
  const prevOwner = await client.query(`SELECT phone_number FROM users WHERE id = $1`, [previousOwnerId]);
  if (prevOwner.rows[0]?.phone_number === number && newPrimaryNumber) {
    await client.query(`UPDATE users SET phone_number = $1, updated_at = NOW() WHERE id = $2`, [newPrimaryNumber, previousOwnerId]);
  }

  // Their ONLY number was reclaimed → deactivate the account + revoke sessions.
  // (users.phone_number is deliberately left = this number, so recovery can match it later.)
  if (previousOwnerDeactivated) {
    await client.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [previousOwnerId]);
    await client.query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`, [previousOwnerId]);
  }

  // Give the number to the reclaimer.
  const inserted = await client.query(
    `INSERT INTO phone_numbers
       (user_id, number, provider, is_primary, is_active, webhook_token, previous_user_id, reclaimed_at)
     VALUES ($1, $2, $3, $4, TRUE, $5, $6, NOW())
     RETURNING id`,
    [newUserId, number, provider, makePrimary, carriedToken, previousOwnerId]
  );

  // Notify the previous owner: new primary if they still have one, else a recover prompt.
  const bodyEn = previousOwnerDeactivated
    ? `The number ${number} was reclaimed. It was your only number, so your account is now inactive. Open TLT and tap "Recover your account" to restore your data.`
    : `The number ${number} was reclaimed. You now sign in with ${newPrimaryNumber}. You keep your past transactions but won't receive new ones for ${number}.`;
  const bodySo = previousOwnerDeactivated
    ? `Lambarka ${number} ayaa dib loo qaatay, wuxuuna ahaa lambarkaaga kaliya, sidaa darteed akoonkaagu hadda waa firfircoon maaha. Fur TLT oo taabo "Soo celi akoonkaaga" si aad xogtaada u soo celiso.`
    : `Lambarka ${number} ayaa dib loo qaatay. Hadda waxaad ku gashaa ${newPrimaryNumber}. Waxaad heysataa wax-ku-dhaqaaqyadii hore, laakiin mar dambe ma heli doontid kuwa cusub ee ${number}.`;
  const notifData = previousOwnerDeactivated ? { screen: "recover", number } : { number };

  const notif = await client.query(
    `INSERT INTO notifications (user_id, type, title_en, title_so, body_en, body_so, data)
     VALUES ($1, 'number_reclaimed', $2, $3, $4, $5, $6) RETURNING id`,
    [
      previousOwnerId,
      "Phone Number Reclaimed",
      "Lambarka Taleefanka Ayaa La Qaatay",
      bodyEn,
      bodySo,
      JSON.stringify(notifData),
    ]
  );

  return { phoneNumberId: inserted.rows[0].id, webhookToken: carriedToken, previousOwnerId, reclaimNotificationId: notif.rows[0].id };
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
     WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.is_primary = TRUE AND pn.deleted_at IS NULL`,
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
     WHERE pn.number = $1 AND pn.is_active = TRUE AND pn.is_primary = TRUE AND pn.deleted_at IS NULL`,
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
  let transfer: Awaited<ReturnType<typeof transferNumberToUser>> | undefined;
  try {
    await client2.query("BEGIN");
    transfer = await transferNumberToUser(client2, { number: phoneNumber, newUserId: newUserId!, makePrimary: true });
    await client2.query("COMMIT");
  } catch (e) {
    await client2.query("ROLLBACK");
    throw e;
  } finally {
    client2.release();
  }
  if (transfer) await enqueueStoredPush(transfer.reclaimNotificationId, transfer.previousOwnerId);

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
  userId: string; number: string; otp: string;
}): Promise<{ webhookToken: string | null }> {
  const { userId, number, otp } = input;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { userId: challengeUserId } = await verifyChallenge(client, { purpose: "reclaim", phoneNumber: number, code: otp });
    if (challengeUserId !== userId) throw new AppError("OTP_WRONG_ACCOUNT", 400);

    const transfer = await transferNumberToUser(client, { number, newUserId: userId, makePrimary: false });
    await client.query("COMMIT");

    await enqueueStoredPush(transfer.reclaimNotificationId, transfer.previousOwnerId);
    return { webhookToken: transfer.webhookToken };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}


// ── Account recovery — reactivate the most-recent deactivated orphan for a number ──

export async function recoverRequest(number: string): Promise<{ message: string }> {
  const provider = detectProvider(number);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const orphan = await pool.query(
    `SELECT id FROM users
     WHERE phone_number = $1 AND is_active = FALSE AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 1`,
    [number]
  );
  if (!orphan.rowCount) throw new AppError("NO_RECOVERABLE_ACCOUNT", 404);

  // OTP goes to the SIM → only whoever controls the number can recover.
  await issueChallenge({ purpose: "recover", phoneNumber: number, userId: orphan.rows[0].id });
  return { message: "ok" };
}

export async function recoverVerify(
  number: string,
  otp: string,
  newPassword: string,
  signJwt: JwtSigner,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const client = await pool.connect();
  let orphanId: string;
  let notifyPrev: { reclaimNotificationId: string; previousOwnerId: string } | null = null;

  try {
    await client.query("BEGIN");


    const { userId } = await verifyChallenge(client, { purpose: "recover", phoneNumber: number, code: otp });
    if (!userId) throw new AppError("NO_RECOVERABLE_ACCOUNT", 404);
    orphanId = userId;

    // Must still be a deactivated orphan (guard against a concurrent recovery).
    const u = await client.query(`SELECT is_active, deleted_at FROM users WHERE id = $1 FOR UPDATE`, [orphanId]);
    if (!u.rowCount || u.rows[0].deleted_at || u.rows[0].is_active) throw new AppError("RECOVER_UNAVAILABLE", 409);

    // Reactivate: set the new password, restore identity to this number. DEK is untouched → old data returns.
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await client.query(
      `UPDATE users SET is_active = TRUE, password_hash = $1, phone_number = $2, updated_at = NOW() WHERE id = $3`,
      [passwordHash, number, orphanId]
    );

    // Make the number this account's active primary.
    const active = await client.query(
      `SELECT id, user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL FOR UPDATE`,
      [number]
    );
    if (active.rowCount && active.rows[0].user_id !== orphanId) {
      // Held by someone else → take it back (deactivates + notifies them, per (1)).
      const tr = await transferNumberToUser(client, { number, newUserId: orphanId, makePrimary: true });
      notifyPrev = { reclaimNotificationId: tr.reclaimNotificationId, previousOwnerId: tr.previousOwnerId };
    } else if (active.rowCount && active.rows[0].user_id === orphanId) {
      await client.query(`UPDATE phone_numbers SET is_primary = TRUE, updated_at = NOW() WHERE id = $1`, [active.rows[0].id]);
    } else {

      const provider = detectProvider(number);
      if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);
      // const webhookToken = crypto.randomBytes(32).toString("hex");

      // Number is free → attach a fresh active primary row.
      const webhookToken = crypto.randomBytes(32).toString("hex");
      await client.query(
        `INSERT INTO phone_numbers (user_id, number, provider, is_primary, is_active, webhook_token)
         VALUES ($1, $2, $3, TRUE, TRUE, $4)`,
        [orphanId, number, provider!, webhookToken]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  if (notifyPrev) await enqueueStoredPush(notifyPrev.reclaimNotificationId, notifyPrev.previousOwnerId);
  return issueTokens(orphanId!, signJwt, deviceInfo, ipAddress);
}

