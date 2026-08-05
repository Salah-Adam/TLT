import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "crypto";
import { generateDataKey, decryptDataKey } from "./kms";
import { config } from "./config";
import { pool } from "./db";

// ── Field encryption (AES-256-GCM) ──────────────────────────────

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

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

export function decryptField(encryptedBase64: string, dek: Buffer): string {
  const data = Buffer.from(encryptedBase64, "base64");

  const iv      = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// ── Per-user DEK management ──────────────────────────────────────

interface CachedDek {
  dek: Buffer;
  expiresAt: number;
}

const DEK_CACHE_TTL_MS = 60_000;
const dekCache = new Map<string, CachedDek>();

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
export function hashValue(value: string): string {
  return createHmac("sha256", config.hmacSecret).update(value).digest("hex");
}
