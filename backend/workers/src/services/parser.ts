import { config } from "../config";
import { ParseResult } from "../types/job";

/**
 * Send a structured webhook payload to the parser and get back a
 * normalised ParseResult. This is the worker's bridge to Python.
 */
export async function parsePayload(
  provider: string,
  payload: Record<string, unknown>,
  receivedAt: string
): Promise<ParseResult> {
  const response = await fetch(`${config.parser.url}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, payload, received_at: receivedAt }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Parser returned ${response.status}: ${detail}`);
  }

  return (await response.json()) as ParseResult;
}