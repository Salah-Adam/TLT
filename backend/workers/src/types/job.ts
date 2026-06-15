// Mirrors webhook-server's NormalisedStructuredJob — what's on the queue.
export interface NormalisedStructuredJob {
  provider: string;
  phoneNumberId: string;
  userId: string;
  receivedAt: string;
  structuredPayload: Record<string, unknown>;
}

// Mirrors the parser's ParseResult — what /parse returns.
export interface ParseResult {
  provider: string;
  raw_message: string;
  direction: "in" | "out" | null;
  type: "send" | "receive" | "payment" | "bank_deposit" | null;
  amount: number | null;
  currency: string;
  counterparty_name: string | null;
  counterparty_number: string | null;
  balance: number | null;
  service_charge: number;
  reference: string | null;
  timestamp: string | null;
  confidence: number;
  parse_attempted: boolean;
  error: string | null;
}