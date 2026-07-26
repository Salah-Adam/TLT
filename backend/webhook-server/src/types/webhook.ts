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

// What we get back from the database when validating a token
export interface PhoneNumberRecord {
  id: string
  user_id: string
  number: string
  provider: string
  is_active: boolean
}