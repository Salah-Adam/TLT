import crypto from "crypto";
import { pool } from "../db";
import { detectProvider } from "../utils/phone";
import { issueChallenge, verifyChallenge } from "../otp";

// ── Add phone number (step 1: send OTP) ──────────────────────────

export interface AddPhoneNumberInput {
  userId: string;
  number: string;
  displayName?: string;
  classification?: "individual" | "business";
}

export async function addPhoneNumber(input: AddPhoneNumberInput): Promise<{ message: string }> {
  const { userId, number, displayName, classification = "individual"  } = input;

  const provider = detectProvider(number);
  if (!provider) {
    throw Object.assign(
      new Error("Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) numbers are supported."),
      { statusCode: 400 }
    );
  }

  const existing = await pool.query(
    `SELECT user_id FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [number]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    if (existing.rows[0].user_id === userId) {
      throw Object.assign(new Error("You have already added this number"), { statusCode: 409 });
    }
    throw Object.assign(
      new Error("This number is registered to another account. Use the reclaim option if this is your number."),
      { statusCode: 409 }
    );
  }

  // await issueChallenge({ purpose: "add_phone", phoneNumber: number, userId });
  await issueChallenge({
  purpose: "add_phone",
  phoneNumber: number,
  userId,
  payload: { displayName: displayName ?? null, classification },   // ← carry the detai
  });

  return { message: "OTP sent to your number" };
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
  if (!provider) throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { userId: challengeUserId, payload } = await verifyChallenge(client, { purpose: "add_phone", phoneNumber: number, code: otp });
    if (challengeUserId !== userId) {
      throw Object.assign(new Error("This code was not issued for your account."), { statusCode: 400 });
    }

    // Use the details captured at add time; allow an override if sent at verify.
    const displayName = input.displayName ?? payload?.displayName ?? null;
    const classification = input.classification ?? payload?.classification ?? "individual";

    const taken = await client.query(
      `SELECT 1 FROM phone_numbers WHERE number = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [number]
    );
    if (taken.rowCount && taken.rowCount > 0) {
      throw Object.assign(new Error("This number was just taken. Use the reclaim option."), { statusCode: 409 });
    }

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

// export async function verifyPhoneNumberOtp(input: VerifyPhoneNumberInput): Promise<{ webhookToken: string }> {
//   const { userId, number, otp, displayName, classification = "individual" } = input;

//   const provider = detectProvider(number);
//   if (!provider) throw Object.assign(new Error("Phone number prefix not recognised."), { statusCode: 400 });

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const { userId: challengeUserId } = await verifyChallenge(client, { purpose: "add_phone", phoneNumber: number, code: otp });
//     if (challengeUserId !== userId) {
//       throw Object.assign(new Error("This code was not issued for your account."), { statusCode: 400 });
//     }

//     // Re-check it wasn't claimed by someone else between request and verify.
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
//       [userId, number, provider, displayName ?? null, classification, isPrimary, webhookToken]
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
  if (!result.rowCount || result.rowCount === 0) {
    throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
  }

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
  if (!result.rowCount || result.rowCount === 0) {
    throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
  }
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
// import { sendOtp } from "./auth";
// import { detectProvider } from "../utils/phone";

// // Valid providers — must match what's seeded in the providers table
// const VALID_PROVIDERS = ["evcplus", "edahab", "sahal", "zaad"];

// // ── Add phone number ─────────────────────────────────────────────

// // export interface AddPhoneNumberInput {
// //   userId: string;
// //   number: string;
// //   displayName?: string;
// //   classification?: "individual" | "business";
// // }

// // /**
// //  * Step 1 of adding a phone number.
// //  * Validates the number, generates a webhook token, inserts the row
// //  * as inactive, then sends OTP to the number for verification.
// //  * The number is inactive until OTP is verified — it cannot receive
// //  * webhooks until the user proves they own it.
// //  */
// // export async function addPhoneNumber(
// //   input: AddPhoneNumberInput
// // ): Promise<{ phoneNumberId: string }> {
// //   const {
// //     userId,
// //     number,
// //     displayName,
// //     classification = "individual",
// //   } = input;

// //   // Validate provider
// //   // if (!VALID_PROVIDERS.includes(provider)) {
// //   //   throw Object.assign(
// //   //     new Error(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`),
// //   //     { statusCode: 400 }
// //   //   );
// //   // }
// //   // Auto-detect provider from number prefix
// //   const detectedProvider = detectProvider(number);
// //   if (!detectedProvider) {
// //     throw Object.assign(
// //       new Error("Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) numbers are supported."),
// //       { statusCode: 400 }
// //     );
// //   }

// //   // Check number not already active under any user
// //   const existing = await pool.query(
// //     `SELECT id, user_id, is_active FROM phone_numbers
// //      WHERE number = $1 AND deleted_at IS NULL`,
// //     [number]
// //   );

// //   if (existing.rowCount && existing.rowCount > 0) {
// //     const row = existing.rows[0];
// //     if (row.user_id === userId) {
// //       throw Object.assign(
// //         new Error("You have already added this number"),
// //         { statusCode: 409 }
// //       );
// //     }
// //     if (row.is_active) {
// //       throw Object.assign(
// //         new Error("This number is registered to another account. Use the reclaim option if this is your number."),
// //         { statusCode: 409 }
// //       );
// //     }
// //   }

// //   // Generate a unique webhook token — this is what telecoms will use
// //   // to authenticate their webhook calls for this specific number
// //   const webhookToken = crypto.randomBytes(32).toString("hex");

// //   // Check if this user already has any numbers — first number is primary
// //   const existingCount = await pool.query(
// //     `SELECT COUNT(*) FROM phone_numbers
// //      WHERE user_id = $1 AND deleted_at IS NULL`,
// //     [userId]
// //   );
// //   const isPrimary = parseInt(existingCount.rows[0].count) === 0;

// //   // Insert as inactive — activated after OTP verification
// //   const result = await pool.query(
// //     `INSERT INTO phone_numbers
// //        (user_id, number, provider, display_name, classification,
// //         is_primary, is_active, webhook_token)
// //      VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)
// //      RETURNING id`,
// //     [userId, number, detectedProvider, displayName ?? null, classification, isPrimary, webhookToken]
// //   );

// //   const phoneNumberId: string = result.rows[0].id;

// //   // Store OTP on the user row and send it to the number
// //   await sendOtp(userId, number);

// //   return { phoneNumberId };
// // }
// export interface AddPhoneNumberInput {
//   userId: string;
//   number: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function addPhoneNumber(
//   input: AddPhoneNumberInput
// ): Promise<{ message: string }> {
//   const { userId, number } = input;

//   // Auto-detect provider from number prefix
//   const detectedProvider = detectProvider(number);
//   if (!detectedProvider) {
//     throw Object.assign(
//       new Error("Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) numbers are supported."),
//       { statusCode: 400 }
//     );
//   }

//   // Check number not already active under any user
//   const existing = await pool.query(
//     `SELECT id, user_id FROM phone_numbers
//      WHERE number = $1 AND deleted_at IS NULL AND is_active = TRUE`,
//     [number]
//   );

//   if (existing.rowCount && existing.rowCount > 0) {
//     const row = existing.rows[0];
//     if (row.user_id === userId) {
//       throw Object.assign(
//         new Error("You have already verified this number"),
//         { statusCode: 409 }
//       );
//     }
//     throw Object.assign(
//       new Error("This number is registered to another account. Use the reclaim option if this is your number."),
//       { statusCode: 409 }
//     );
//   }

//   // Send OTP — nothing inserted into phone_numbers yet
//   await sendOtp(userId, number);

//   return { message: "OTP sent to your number" };
// }
// // ── Verify phone number OTP ──────────────────────────────────────

// // /**
// //  * Step 2 of adding a phone number.
// //  * Verifies the OTP and activates the number.
// //  * After this, the webhook token is live and the telecom can start
// //  * sending transaction webhooks for this number.
// //  */
// // export async function verifyPhoneNumberOtp(
// //   userId: string,
// //   phoneNumberId: string,
// //   otp: string
// // ): Promise<{ webhookToken: string }> {
// //   // Confirm this phone number belongs to this user
// //   const result = await pool.query(
// //     `SELECT id, webhook_token FROM phone_numbers
// //      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
// //     [phoneNumberId, userId]
// //   );

// //   if (!result.rowCount || result.rowCount === 0) {
// //     throw Object.assign(
// //       new Error("Phone number not found"),
// //       { statusCode: 404 }
// //     );
// //   }

// //   // Verify the OTP stored on the user row
// //   // We reuse the same OTP column on users — one active OTP at a time
// //   const userOtp = await pool.query(
// //     `SELECT otp_code, otp_expires_at FROM users WHERE id = $1`,
// //     [userId]
// //   );

// //   const user = userOtp.rows[0];

// //   if (!user.otp_code) {
// //     throw Object.assign(new Error("No OTP requested"), { statusCode: 400 });
// //   }
// //   if (new Date(user.otp_expires_at) < new Date()) {
// //     throw Object.assign(new Error("OTP has expired"), { statusCode: 400 });
// //   }
// //   if (user.otp_code !== otp) {
// //     throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });
// //   }

// //   // Clear OTP
// //   await pool.query(
// //     `UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1`,
// //     [userId]
// //   );

// //   // Activate the number
// //   await pool.query(
// //     `UPDATE phone_numbers
// //      SET is_active = TRUE, updated_at = NOW()
// //      WHERE id = $1`,
// //     [phoneNumberId]
// //   );

// //   // Return the webhook token — user shares this with the telecom
// //   // so the telecom can authenticate their webhook calls
// //   const webhookToken: string = result.rows[0].webhook_token;
// //   return { webhookToken };
// // }

// export interface VerifyPhoneNumberInput {
//   userId: string;
//   number: string;
//   otp: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function verifyPhoneNumberOtp(
//   input: VerifyPhoneNumberInput
// ): Promise<{ webhookToken: string }> {
//   const { userId, number, otp, displayName, classification = "individual" } = input;

//   // Verify OTP from users row
//   const userResult = await pool.query(
//     `SELECT otp_code, otp_expires_at FROM users WHERE id = $1`,
//     [userId]
//   );

//   const user = userResult.rows[0];

//   if (!user.otp_code) {
//     throw Object.assign(new Error("No OTP requested"), { statusCode: 400 });
//   }
//   if (new Date(user.otp_expires_at) < new Date()) {
//     throw Object.assign(
//       new Error("OTP has expired. Please request a new one."),
//       { statusCode: 400 }
//     );
//   }
//   if (user.otp_code !== otp) {
//     throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });
//   }

//   // Clear OTP — cannot be reused
//   await pool.query(
//     `UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1`,
//     [userId]
//   );

//   // Detect provider from number
//   const detectedProvider = detectProvider(number);
//   if (!detectedProvider) {
//     throw Object.assign(
//       new Error("Phone number prefix not recognised."),
//       { statusCode: 400 }
//     );
//   }

//   // First number for this user = primary
//   const countResult = await pool.query(
//     `SELECT COUNT(*) FROM phone_numbers
//      WHERE user_id = $1 AND deleted_at IS NULL`,
//     [userId]
//   );
//   const isPrimary = parseInt(countResult.rows[0].count) === 0;

//   // Generate webhook token
//   const webhookToken = crypto.randomBytes(32).toString("hex");

//   // Insert into phone_numbers NOW — only after OTP verified
//   await pool.query(
//     `INSERT INTO phone_numbers
//        (user_id, number, provider, display_name, classification,
//         is_primary, is_active, webhook_token)
//      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
//     [
//       userId,
//       number,
//       detectedProvider,
//       displayName ?? null,
//       classification,
//       isPrimary,
//       webhookToken,
//     ]
//   );

//   return { webhookToken };
// }
// // ── List phone numbers ───────────────────────────────────────────

// export async function listPhoneNumbers(userId: string): Promise<object[]> {
//   const result = await pool.query(
//     `SELECT
//        pn.id,
//        pn.number,
//        pn.provider,
//        p.company_name        AS provider_name,
//        pn.display_name,
//        pn.classification,
//        pn.is_primary,
//        pn.is_active,
//        pn.webhook_token,
//        pn.last_sync_at,
//        pn.created_at
//      FROM phone_numbers pn
//      JOIN providers p ON p.code = pn.provider
//      WHERE pn.user_id = $1
//        AND pn.deleted_at IS NULL
//      ORDER BY pn.is_primary DESC, pn.created_at ASC`,
//     [userId]
//   );

//   return result.rows;
// }

// // ── Update phone number ──────────────────────────────────────────

// export interface UpdatePhoneNumberInput {
//   userId: string;
//   phoneNumberId: string;
//   displayName?: string;
//   classification?: "individual" | "business";
// }

// export async function updatePhoneNumber(
//   input: UpdatePhoneNumberInput
// ): Promise<void> {
//   const { userId, phoneNumberId, displayName, classification } = input;

//   // Confirm ownership
//   const result = await pool.query(
//     `SELECT id FROM phone_numbers
//      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
//     [phoneNumberId, userId]
//   );

//   if (!result.rowCount || result.rowCount === 0) {
//     throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
//   }

//   // Only update fields that were provided
//   if (displayName !== undefined) {
//     await pool.query(
//       `UPDATE phone_numbers
//        SET display_name = $1, updated_at = NOW()
//        WHERE id = $2`,
//       [displayName, phoneNumberId]
//     );
//   }

//   if (classification !== undefined) {
//     await pool.query(
//       `UPDATE phone_numbers
//        SET classification = $1, updated_at = NOW()
//        WHERE id = $2`,
//       [classification, phoneNumberId]
//     );
//   }
// }


// // ── Delete phone number ──────────────────────────────────────────

// export async function deletePhoneNumber(
//   userId: string,
//   phoneNumberId: string
// ): Promise<{ accountDeleted: boolean }> {
//   // Confirm ownership and get details
//   const result = await pool.query(
//     `SELECT id, is_primary FROM phone_numbers
//      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
//     [phoneNumberId, userId]
//   );

//   if (!result.rowCount || result.rowCount === 0) {
//     throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
//   }

//   const number = result.rows[0];

//   // Count remaining active numbers
//   const countResult = await pool.query(
//     `SELECT COUNT(*) FROM phone_numbers
//      WHERE user_id = $1 AND deleted_at IS NULL`,
//     [userId]
//   );
//   const totalNumbers = parseInt(countResult.rows[0].count);

//   if (totalNumbers === 1) {
//     // Last number — soft delete number + soft delete account + revoke all sessions
//     const client = await pool.connect();
//     try {
//       await client.query("BEGIN");

//       await client.query(
//         `UPDATE phone_numbers
//          SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
//          WHERE id = $1`,
//         [phoneNumberId]
//       );

//       await client.query(
//         `UPDATE users
//          SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
//          WHERE id = $1`,
//         [userId]
//       );

//       await client.query(
//         `UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`,
//         [userId]
//       );

//       await client.query("COMMIT");
//     } catch (e) {
//       await client.query("ROLLBACK");
//       throw e;
//     } finally {
//       client.release();
//     }

//     return { accountDeleted: true };
//   }

//   // Multiple numbers exist — just soft delete this one
//   // If it was primary, auto-promote the oldest remaining number
//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     await client.query(
//       `UPDATE phone_numbers
//        SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
//        WHERE id = $1`,
//       [phoneNumberId]
//     );

//     if (number.is_primary) {
//       // Auto-promote oldest remaining number to primary
//       await client.query(
//         `UPDATE phone_numbers
//          SET is_primary = TRUE, updated_at = NOW()
//          WHERE id = (
//            SELECT id FROM phone_numbers
//            WHERE user_id = $1
//              AND id != $2
//              AND deleted_at IS NULL
//            ORDER BY created_at ASC
//            LIMIT 1
//          )`,
//         [userId, phoneNumberId]
//       );
//     }

//     await client.query("COMMIT");
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }

//   return { accountDeleted: false };
// }

// // /**
// //  * Soft deletes a phone number.
// //  * Sets deleted_at and deactivates — webhook-server will reject
// //  * any future webhooks for this token since is_active = FALSE.
// //  * Cannot delete the primary number if other numbers exist.
// //  */
// // export async function deletePhoneNumber(
// //   userId: string,
// //   phoneNumberId: string
// // ): Promise<void> {
// //   // Confirm ownership and get details
// //   const result = await pool.query(
// //     `SELECT id, is_primary FROM phone_numbers
// //      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
// //     [phoneNumberId, userId]
// //   );

// //   if (!result.rowCount || result.rowCount === 0) {
// //     throw Object.assign(new Error("Phone number not found"), { statusCode: 404 });
// //   }

// //   const number = result.rows[0];

// //   // Prevent deleting primary number if others exist
// //   if (number.is_primary) {
// //     const otherCount = await pool.query(
// //       `SELECT COUNT(*) FROM phone_numbers
// //        WHERE user_id = $1
// //          AND id != $2
// //          AND deleted_at IS NULL`,
// //       [userId, phoneNumberId]
// //     );
// //     if (parseInt(otherCount.rows[0].count) > 0) {
// //       throw Object.assign(
// //         new Error("Cannot delete your primary number while other numbers exist. Set another number as primary first."),
// //         { statusCode: 400 }
// //       );
// //     }
// //   }

// //   // Soft delete + deactivate
// //   await pool.query(
// //     `UPDATE phone_numbers
// //      SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
// //      WHERE id = $1`,
// //     [phoneNumberId]
// //   );
// // }