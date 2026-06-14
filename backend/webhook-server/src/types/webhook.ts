// Raw payload shapes from each telecom
// These are intentionally loose (unknown fields allowed)
// because telecoms can send extra fields we don't expect

export interface EVCPlusWebhookPayload {
  message?: string      // raw SMS text
  msisdn?: string       // phone number
  shortcode?: string    // sender shortcode
  [key: string]: unknown
}

export interface EDahabWebhookPayload {
  message?: string
  sender?: string
  receiver?: string
  [key: string]: unknown
}


// Union of all provider payloads
export type RawWebhookPayload =
  | EVCPlusWebhookPayload
  | EDahabWebhookPayload



// ── What goes into the BullMQ queue ──────────────────────────────────────────
// What goes into the BullMQ queue — structured JSON format
// The worker reads this and sends structuredPayload to the parser service
export interface NormalisedStructuredJob {
  provider:          string
  phoneNumberId:     string
  userId:            string
  receivedAt:        string
  // The full structured JSON payload from the telecom
  // Sent as-is to POST /parse on the parser service
  structuredPayload: Record<string, unknown>
}

// This replaces the old QueuedTransactionJob.
//
// Key change: instead of pushing rawWebhook (the entire provider payload),
// we push rawMessage (the extracted SMS text).
//
// Why this matters:
//   Old way → worker receives { rawWebhook: { message: "...", msisdn: "...", shortcode: "..." } }
//             Worker must know to look inside rawWebhook.message for the SMS text.
//             Worker must know EVC Plus uses "message" and eDahab also uses "message".
//             Worker is coupled to provider payload shapes.
//
//   New way → worker receives { rawMessage: "[-EVCPLUS-] $1 ayaad..." }
//             Worker always finds the SMS text in the same field.
//             Worker knows nothing about provider payload shapes.
//             That knowledge stays here in the webhook server, where it belongs.
// export interface NormalisedSMSJob {
//   provider:      string   // "evcplus" | "edahab"
//   phoneNumberId: string   // database ID of the phone number record
//   userId:        string   // database ID of the user
//   receivedAt:    string   // ISO timestamp of webhook arrival
//   rawMessage:    string   // the extracted SMS text — always in this field
//   senderNumber:  string | null  // the number that sent/received money
//                                 // EVC Plus: from msisdn field
//                                 // eDahab: from sender or receiver field
// }

  
// What we push into the BullMQ queue
// Clean, provider-agnostic, validated

// export interface QueuedTransactionJob {
//   provider: string
//   phoneNumberId: string
//   userId: string
//   rawWebhook: RawWebhookPayload
//   receivedAt: string    // ISO timestamp
// }



// What we get back from the database when validating a token
export interface PhoneNumberRecord {
  id: string
  user_id: string
  number: string
  provider: string
  is_active: boolean
}