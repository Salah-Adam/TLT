import { config } from "../config";
import fs from "fs";

let messaging: { send: (m: unknown) => Promise<string> } | null = null;

// Loads firebase-admin only when real credentials exist (Phase 6).
async function ensureInit(): Promise<void> {
  if (messaging || !config.fcm.credentialsPath) return;
  if (!fs.existsSync(config.fcm.credentialsPath)) return;

  const mod = await import("firebase-admin");
  const admin = (mod as { default?: unknown }).default ?? mod as unknown;
  const a = admin as any;
  const serviceAccount = JSON.parse(fs.readFileSync(config.fcm.credentialsPath, "utf8"));
  if (a.apps.length === 0) {
    a.initializeApp({ credential: a.credential.cert(serviceAccount) });
  }
  messaging = a.messaging();
}

export interface PushParams {
  token: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * Send a push. Three cases:
 *  - no token        → skip (returns null)
 *  - no credentials  → dry-run: log and return a synthetic id
 *  - credentials set → real FCM send (Phase 6), returns the message id
 */
export async function sendPush(p: PushParams): Promise<string | null> {
  if (!p.token) {
    console.log("  fcm: no device token — push skipped");
    return null;
  }

  await ensureInit();

  // FCM data payload must be string → string.
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.data)) data[k] = v == null ? "" : String(v);

  if (!messaging) {
    console.log(`  fcm (dry-run): would push "${p.title}" → ${p.token.slice(0, 12)}…`);
    return `dry-run-${Date.now()}`;
  }

  const id = await messaging.send({
    token: p.token,
    notification: { title: p.title, body: p.body },
    data,
  });
  console.log(`  fcm: sent (${id})`);
  return id;
}