import crypto from "crypto";
import { pool } from "../db";
import { detectProvider } from "../utils/phone";
import { issueChallenge, verifyChallenge } from "../otp";
import { AppError } from "../lib/errors";

// ── Add phone number (step 1: send OTP) ──────────────────────────

export interface AddPhoneNumberInput {
  userId: string;
  number: string;
  displayName?: string;
  classification?: "individual" | "business";
}

export async function addPhoneNumber(input: AddPhoneNumberInput): Promise<{ message: string }> {
  const { userId, number, displayName, classification = "individual" } = input;

  const provider = detectProvider(number);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const existing = await pool.query(
    `SELECT user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [number]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    if (existing.rows[0].user_id === userId) throw new AppError("ALREADY_ADDED_NUMBER", 409);
    throw new AppError("NUMBER_OWNED_BY_OTHER", 409);
  }

  await issueChallenge({
    purpose: "add_phone",
    phoneNumber: number,
    userId,
    payload: { displayName: displayName ?? null, classification },
  });

  return { message: "ok" };
}

// ── Verify phone number OTP (step 2: insert the row) ─────────────

export interface VerifyPhoneNumberInput {
  userId: string;
  number: string;
  otp: string;
  displayName?: string;
  classification?: "individual" | "business";
}

export async function verifyPhoneNumberOtp(input: VerifyPhoneNumberInput): Promise<{ webhookToken: string }> {
  const { userId, number, otp } = input;

  const provider = detectProvider(number);
  if (!provider) throw new AppError("PHONE_PREFIX_UNRECOGNISED", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { userId: challengeUserId, payload } = await verifyChallenge(client, { purpose: "add_phone", phoneNumber: number, code: otp });
    if (challengeUserId !== userId) throw new AppError("OTP_WRONG_ACCOUNT", 400);

    const displayName = input.displayName ?? payload?.displayName ?? null;
    const classification = input.classification ?? payload?.classification ?? "individual";

    const taken = await client.query(
      `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [number]
    );
    if (taken.rowCount && taken.rowCount > 0) throw new AppError("NUMBER_JUST_TAKEN", 409);

    const countResult = await client.query(
      `SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    const isPrimary = parseInt(countResult.rows[0].count) === 0;
    const webhookToken = crypto.randomBytes(32).toString("hex");

    await client.query(
      `INSERT INTO phone_numbers
         (user_id, number, provider, display_name, classification, is_primary, is_active, webhook_token)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [userId, number, provider, displayName, classification, isPrimary, webhookToken]
    );

    await client.query("COMMIT");
    return { webhookToken };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ── List ─────────────────────────────────────────────────────────

export async function listPhoneNumbers(userId: string): Promise<object[]> {
  const result = await pool.query(
    `SELECT pn.id, pn.number, pn.provider, p.company_name AS provider_name,
            pn.display_name, pn.classification, pn.is_primary, pn.is_active,
            pn.webhook_token, pn.last_sync_at, pn.created_at
     FROM phone_numbers pn
     JOIN providers p ON p.code = pn.provider
     WHERE pn.user_id = $1 AND pn.deleted_at IS NULL
     ORDER BY pn.is_primary DESC, pn.created_at ASC`,
    [userId]
  );
  return result.rows;
}

// ── Update ───────────────────────────────────────────────────────

export interface UpdatePhoneNumberInput {
  userId: string;
  phoneNumberId: string;
  displayName?: string;
  classification?: "individual" | "business";
}

export async function updatePhoneNumber(input: UpdatePhoneNumberInput): Promise<void> {
  const { userId, phoneNumberId, displayName, classification } = input;

  const result = await pool.query(
    `SELECT id FROM phone_numbers WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [phoneNumberId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new AppError("PHONE_NOT_FOUND", 404);

  if (displayName !== undefined) {
    await pool.query(`UPDATE phone_numbers SET display_name=$1, updated_at=NOW() WHERE id=$2`, [displayName, phoneNumberId]);
  }
  if (classification !== undefined) {
    await pool.query(`UPDATE phone_numbers SET classification=$1, updated_at=NOW() WHERE id=$2`, [classification, phoneNumberId]);
  }
}

// ── Delete (last number → delete account) ────────────────────────

export async function deletePhoneNumber(
  userId: string,
  phoneNumberId: string
): Promise<{ accountDeleted: boolean }> {
  const result = await pool.query(
    `SELECT id, is_primary FROM phone_numbers WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [phoneNumberId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new AppError("PHONE_NOT_FOUND", 404);
  const number = result.rows[0];

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const totalNumbers = parseInt(countResult.rows[0].count);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE phone_numbers SET deleted_at=NOW(), is_active=FALSE, updated_at=NOW() WHERE id=$1`,
      [phoneNumberId]
    );

    if (totalNumbers === 1) {
      await client.query(`UPDATE users SET deleted_at=NOW(), is_active=FALSE, updated_at=NOW() WHERE id=$1`, [userId]);
      await client.query(`UPDATE refresh_tokens SET is_revoked=TRUE WHERE user_id=$1`, [userId]);
      await client.query("COMMIT");
      return { accountDeleted: true };
    }

    if (number.is_primary) {
      await client.query(
        `UPDATE phone_numbers SET is_primary=TRUE, updated_at=NOW()
         WHERE id = (
           SELECT id FROM phone_numbers
           WHERE user_id=$1 AND id<>$2 AND deleted_at IS NULL
           ORDER BY created_at ASC LIMIT 1
         )`,
        [userId, phoneNumberId]
      );
    }

    await client.query("COMMIT");
    return { accountDeleted: false };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}






// import crypto from "crypto";
// import { pool } from "../db";
// import { detectProvider } from "../utils/phone";
// import { issueChallenge, verifyChallenge } from "../otp";

// // ── Add phone number (step 1: send OTP) ──────────────────────────

// export interface AddPhoneNumberInput {
//   userId: string;
//   number: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function addPhoneNumber(input: AddPhoneNumberInput): Promise<{ message: string }> {
//   const { userId, number, displayName, classification = "individual"  } = input;

//   const provider = detectProvider(number);
//   if (!provider) {
//     throw Object.assign(
//       new Error("Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) numbers are supported."),
//       { statusCode: 400 }
//     );
//   }

//   const existing = await pool.query(
//     `SELECT user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
//     [number]
//   );
//   if (existing.rowCount && existing.rowCount > 0) {
//     if (existing.rows[0].user_id === userId) {
//       throw Object.assign(new Error("You have already added this number"), { statusCode: 409 });
//     }
//     throw Object.assign(
//       new Error("This number is registered to another account. Use the reclaim option if this is your number."),
//       { statusCode: 409 }
//     );
//   }

//   // await issueChallenge({ purpose: "add_phone", phoneNumber: number, userId });
//   await issueChallenge({
//   purpose: "add_phone",
//   phoneNumber: number,
//   userId,
//   payload: { displayName: displayName ?? null, classification },   // ← carry the detai
//   });

//   return { message: "OTP sent to your number" };
// }

// // ── Verify phone number OTP (step 2: insert the row) ─────────────

// export interface VerifyPhoneNumberInput {
//   userId: string;
//   number: string;
//   otp: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function verifyPhoneNumberOtp(input: VerifyPhoneNumberInput): Promise<{ webhookToken: string }> {
//   const { userId, number, otp } = input;

//   const provider = detectProvider(number);
//   if (!provider) throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const { userId: challengeUserId, payload } = await verifyChallenge(client, { purpose: "add_phone", phoneNumber: number, code: otp });
//     if (challengeUserId !== userId) {
//       throw Object.assign(new Error("This code was not issued for your account."), { statusCode: 400 });
//     }

//     // Use the details captured at add time; allow an override if sent at verify.
//     const displayName = input.displayName ?? payload?.displayName ?? null;
//     const classification = input.classification ?? payload?.classification ?? "individual";

//     const taken = await client.query(
//       `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
//       [number]
//     );
//     if (taken.rowCount && taken.rowCount > 0) {
//       throw Object.assign(new Error("This number was just taken. Use the reclaim option."), { statusCode: 409 });
//     }

//     const countResult = await client.query(
//       `SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL`,
//       [userId]
//     );
//     const isPrimary = parseInt(countResult.rows[0].count) === 0;
//     const webhookToken = crypto.randomBytes(32).toString("hex");

//     await client.query(
//       `INSERT INTO phone_numbers
//          (user_id, number, provider, display_name, classification, is_primary, is_active, webhook_token)
//        VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
//       [userId, number, provider, displayName, classification, isPrimary, webhookToken]
//     );

//     await client.query("COMMIT");
//     return { webhookToken };
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// }

// // export async function verifyPhoneNumberOtp(input: VerifyPhoneNumberInput): Promise<{ webhookToken: string }> {
// //   const { userId, number, otp, displayName, classification = "individual" } = input;

// //   const provider = detectProvider(number);
// //   if (!provider) throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });

// //   const client = await pool.connect();
// //   try {
// //     await client.query("BEGIN");

// //     const { userId: challengeUserId } = await verifyChallenge(client, { purpose: "add_phone", phoneNumber: number, code: otp });
// //     if (challengeUserId !== userId) {
// //       throw Object.assign(new Error("This code was not issued for your account."), { statusCode: 400 });
// //     }

// //     // Re-check it wasn't claimed by someone else between request and verify.
// //     const taken = await client.query(
// //       `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
// //       [number]
// //     );
// //     if (taken.rowCount && taken.rowCount > 0) {
// //       throw Object.assign(new Error("This number was just taken. Use the reclaim option."), { statusCode: 409 });
// //     }

// //     const countResult = await client.query(
// //       `SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL`,
// //       [userId]
// //     );
// //     const isPrimary = parseInt(countResult.rows[0].count) === 0;
// //     const webhookToken = crypto.randomBytes(32).toString("hex");

// //     await client.query(
// //       `INSERT INTO phone_numbers
// //          (user_id, number, provider, display_name, classification, is_primary, is_active, webhook_token)
// //        VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
// //       [userId, number, provider, displayName ?? null, classification, isPrimary, webhookToken]
// //     );

// //     await client.query("COMMIT");
// //     return { webhookToken };
// //   } catch (e) {
// //     await client.query("ROLLBACK");
// //     throw e;
// //   } finally {
// //     client.release();
// //   }
// // }

// // ── List ─────────────────────────────────────────────────────────

// export async function listPhoneNumbers(userId: string): Promise<object[]> {
//   const result = await pool.query(
//     `SELECT pn.id, pn.number, pn.provider, p.company_name AS provider_name,
//             pn.display_name, pn.classification, pn.is_primary, pn.is_active,
//             pn.webhook_token, pn.last_sync_at, pn.created_at
//      FROM phone_numbers pn
//      JOIN providers p ON p.code = pn.provider
//      WHERE pn.user_id = $1 AND pn.deleted_at IS NULL
//      ORDER BY pn.is_primary DESC, pn.created_at ASC`,
//     [userId]
//   );
//   return result.rows;
// }

// // ── Update ───────────────────────────────────────────────────────

// export interface UpdatePhoneNumberInput {
//   userId: string;
//   phoneNumberId: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function updatePhoneNumber(input: UpdatePhoneNumberInput): Promise<void> {
//   const { userId, phoneNumberId, displayName, classification } = input;

//   const result = await pool.query(
//     `SELECT id FROM phone_numbers WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
//     [phoneNumberId, userId]
//   );
//   if (!result.rowCount || result.rowCount === 0) {
//     throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
//   }

//   if (displayName !== undefined) {
//     await pool.query(`UPDATE phone_numbers SET display_name=$1, updated_at=NOW() WHERE id=$2`, [displayName, phoneNumberId]);
//   }
//   if (classification !== undefined) {
//     await pool.query(`UPDATE phone_numbers SET classification=$1, updated_at=NOW() WHERE id=$2`, [classification, phoneNumberId]);
//   }
// }

// // ── Delete (last number → delete account) ────────────────────────

// export async function deletePhoneNumber(
//   userId: string,
//   phoneNumberId: string
// ): Promise<{ accountDeleted: boolean }> {
//   const result = await pool.query(
//     `SELECT id, is_primary FROM phone_numbers WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
//     [phoneNumberId, userId]
//   );
//   if (!result.rowCount || result.rowCount === 0) {
//     throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
//   }
//   const number = result.rows[0];

//   const countResult = await pool.query(
//     `SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL`,
//     [userId]
//   );
//   const totalNumbers = parseInt(countResult.rows[0].count);

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     await client.query(
//       `UPDATE phone_numbers SET deleted_at=NOW(), is_active=FALSE, updated_at=NOW() WHERE id=$1`,
//       [phoneNumberId]
//     );

//     if (totalNumbers === 1) {
//       await client.query(`UPDATE users SET deleted_at=NOW(), is_active=FALSE, updated_at=NOW() WHERE id=$1`, [userId]);
//       await client.query(`UPDATE refresh_tokens SET is_revoked=TRUE WHERE user_id=$1`, [userId]);
//       await client.query("COMMIT");
//       return { accountDeleted: true };
//     }

//     if (number.is_primary) {
//       await client.query(
//         `UPDATE phone_numbers SET is_primary=TRUE, updated_at=NOW()
//          WHERE id = (
//            SELECT id FROM phone_numbers
//            WHERE user_id=$1 AND id<>$2 AND deleted_at IS NULL
//            ORDER BY created_at ASC LIMIT 1
//          )`,
//         [userId, phoneNumberId]
//       );
//     }

//     await client.query("COMMIT");
//     return { accountDeleted: false };
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// }
