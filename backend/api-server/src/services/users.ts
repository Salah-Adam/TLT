import argon2 from "argon2";
import { pool } from "../db";
import { config } from "../config";
import { AppError } from "../lib/errors";
import { Lang } from "../lib/messages";
import { JwtSigner } from "../types/jwt";

function shapeProfile(u: any) {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email ?? null,
    phone_number: u.phone_number,
    language: u.language,
    age: u.age ?? null,
    city: u.city ?? null,
    sex: u.sex ?? null,
    created_at: u.created_at,
  };
}

const SELECT_PROFILE = `
  SELECT id, full_name, email, phone_number, language, age, city, sex, created_at
  FROM users
`;

// ── Read profile ─────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const u = (await pool.query(`${SELECT_PROFILE} WHERE id=$1 AND deleted_at IS NULL`, [userId])).rows[0];
  if (!u) throw new AppError("ACCOUNT_NOT_FOUND", 404);
  return shapeProfile(u);
}

// ── Update profile ───────────────────────────────────────────────
export async function updateProfile(input: {
  userId: string;
  fullName?: string;
  email?: string | null;
  age?: number | null;
  city?: string | null;
  sex?: string | null;
}) {
  const { userId } = input;
  const sets: string[] = [];
  const params: any[] = [];

  if (input.fullName !== undefined) { params.push(input.fullName); sets.push(`full_name=$${params.length}`); }
  if (input.email !== undefined)    { params.push(input.email);    sets.push(`email=$${params.length}`); }
  if (input.age !== undefined)      { params.push(input.age);      sets.push(`age=$${params.length}`); }
  if (input.city !== undefined)     { params.push(input.city);     sets.push(`city=$${params.length}`); }
  if (input.sex !== undefined)      { params.push(input.sex);      sets.push(`sex=$${params.length}`); }

  if (sets.length === 0) return getProfile(userId);

  // email is UNIQUE — block if another live account already has it
  if (input.email) {
    const taken = await pool.query(
      `SELECT 1 FROM users WHERE email=$1 AND id<>$2 AND deleted_at IS NULL`,
      [input.email, userId]
    );
    if (taken.rowCount) throw new AppError("EMAIL_TAKEN", 409, { field: "email" });
  }

  params.push(userId);
  const r = await pool.query(
    `UPDATE users SET ${sets.join(", ")}, updated_at=NOW()
     WHERE id=$${params.length} AND deleted_at IS NULL RETURNING id`,
    params
  );
  if (!r.rowCount) throw new AppError("ACCOUNT_NOT_FOUND", 404);
  return getProfile(userId);
}

// ── Change password (authenticated; single-session = nothing else to revoke) ──
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const u = (await pool.query(`SELECT password_hash FROM users WHERE id=$1 AND deleted_at IS NULL`, [userId])).rows[0];
  if (!u) throw new AppError("ACCOUNT_NOT_FOUND", 404);

  const valid = await argon2.verify(u.password_hash, currentPassword);
  if (!valid) throw new AppError("CURRENT_PASSWORD_WRONG", 400, { field: "currentPassword" });

  const same = await argon2.verify(u.password_hash, newPassword);
  if (same) throw new AppError("PASSWORD_UNCHANGED", 400, { field: "newPassword" });

  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await pool.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [newHash, userId]);
}

// ── Set language (re-issue access token so the change is instant) ──
export async function setLanguage(userId: string, lang: Lang, signJwt: JwtSigner) {
  const u = (await pool.query(
    `UPDATE users SET language=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL RETURNING language`,
    [lang, userId]
  )).rows[0];
  if (!u) throw new AppError("ACCOUNT_NOT_FOUND", 404);

  const accessToken = signJwt({ sub: userId, type: "access", lang }, { expiresIn: config.jwt.accessExpiresIn });
  return { language: lang, accessToken };
}

// ── Register / claim device for push ─────────────────────────────
export async function registerDevice(userId: string, token: string, platform?: string) {
  // Upsert by token: if it already exists (even under another user), the
  // ON CONFLICT reassigns it to this user — that's how a device is "claimed".
  await pool.query(
    `INSERT INTO device_tokens (user_id, token, platform, is_active, last_used_at)
     VALUES ($1, $2, $3, TRUE, NOW())
     ON CONFLICT (token) DO UPDATE
       SET user_id   = EXCLUDED.user_id,
           platform  = COALESCE(EXCLUDED.platform, device_tokens.platform),
           is_active = TRUE,
           last_used_at = NOW()`,
    [userId, token, platform ?? null]
  );
}