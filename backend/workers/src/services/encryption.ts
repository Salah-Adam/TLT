import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { generateDataKey, decryptDataKey } from "./kms";
import { config } from "../config";
import { pool } from "../db";
import { createHmac } from "crypto"; // add to the existing crypto import line


// ── Field encryption (AES-256-GCM) ──────────────────────────────

const IV_LENGTH = 12;       // 96-bit IV — the recommended size for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Encrypt one field with a user's plaintext DEK.
 * The stored value (base64 TEXT) is laid out as:
 *   [ 12-byte IV ][ 16-byte auth tag ][ ciphertext ]
 * We pack all three together so decrypt() can pull them back apart.
 */
export function encryptField(plaintext: string, dek: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Reverse of encryptField. If the stored value was altered in any way,
 * GCM's auth-tag check fails and this THROWS instead of returning
 * corrupted plaintext. Tamper-evidence comes for free.
 */
export function decryptField(encryptedBase64: string, dek: Buffer): string {
  const data = Buffer.from(encryptedBase64, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// ── Per-user DEK management ─────────────────────────────────────

interface CachedDek {
  dek: Buffer;
  expiresAt: number;
}

const DEK_CACHE_TTL_MS = 60_000; // 60s — survives brief KMS hiccups
const dekCache = new Map<string, CachedDek>();

/**
 * Create a brand-new DEK for a user and store its wrapped form.
 * Called once per user — at registration (Phase 5), or in test setup.
 * Returns the plaintext DEK so the caller can use it right away.
 */
export async function createUserDek(userId: string): Promise<Buffer> {
  const { plaintextDek, wrappedDek } = await generateDataKey();

  await pool.query(
    `INSERT INTO user_encryption_keys (user_id, encrypted_dek, kek_version)
     VALUES ($1, $2, $3)`,
    [userId, wrappedDek, config.aws.kekVersion]
  );

  cacheDek(userId, plaintextDek);
  return plaintextDek;
}

/**
 * Get a user's plaintext DEK — from cache if warm, otherwise fetch the
 * wrapped DEK and ask KMS to unwrap it (a single KMS call, then cached).
 */
export async function getUserDek(userId: string): Promise<Buffer> {
  const cached = dekCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.dek;
  }

  const result = await pool.query(
    `SELECT encrypted_dek FROM user_encryption_keys WHERE user_id = $1`,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new Error(`No encryption key found for user ${userId}`);
  }

  const dek = await decryptDataKey(result.rows[0].encrypted_dek);
  cacheDek(userId, dek);
  return dek;
}

function cacheDek(userId: string, dek: Buffer): void {
  dekCache.set(userId, { dek, expiresAt: Date.now() + DEK_CACHE_TTL_MS });
}


/**
 * Invalidate cached DEKs. Call for one user after rotating or revoking
 * their key, or with no argument to clear all. Without this, a rotated
 * key could keep serving from cache for up to 60s.
 */
export function clearDekCache(userId?: string): void {
  if (userId) {
    dekCache.delete(userId);
  } else {
    dekCache.clear();
  }
}


// Canonical MSISDN for hashing/matching: digits only, drop a leading 252 and any leading 0.
export function canonicalPhone(n: string): string {
  let d = (n ?? "").replace(/\D/g, "");
  if (d.startsWith("252")) d = d.slice(3);
  return d.replace(/^0+/, "");
}

/**
 * Deterministic keyed hash of a phone number, for tracked-contact matching.
 * Same number always produces the same hash, so we can match WHERE
 * counterparty_phone_hash = ? without ever decrypting. One-directional —
 * the hash can't be reversed back to the number.
 */
export function hashValue(value: string): string {
  return createHmac("sha256", config.hmacSecret).update(value).digest("hex");
}

