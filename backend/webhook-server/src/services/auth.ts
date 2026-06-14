import pool from '../db'
import { PhoneNumberRecord } from '../types/webhook'

export async function validateWebhookToken(
  token: string | undefined,
  provider: string
): Promise<PhoneNumberRecord | null> {

  // No token = reject immediately, no database query needed
  if (!token || token.trim() === '') {
    return null
  }

  try {
    const result = await pool.query<PhoneNumberRecord>(
      `SELECT id, user_id, number, provider, is_active
       FROM phone_numbers
       WHERE webhook_token = $1
         AND provider = $2
         AND deleted_at IS NULL`,
      [token, provider]
    )

    if (result.rows.length === 0) {
      return null
    }

    const phoneNumber = result.rows[0]

    // Token exists but number is deactivated
    if (!phoneNumber.is_active) {
      return null
    }

    return phoneNumber

  } catch (error) {
    console.error('Database error during webhook token validation:', error)
    // Return null — treat DB errors as auth failures
    // Do not expose error details in the response
    return null
  }
}