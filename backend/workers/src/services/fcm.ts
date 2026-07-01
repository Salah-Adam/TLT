import { config } from "../config";
import fs from "fs";

let messaging: { send: (m: unknown) => Promise<string> } | null = null;

// // Loads firebase-admin only when real credentials exist (Phase 6).
// async function ensureInit(): Promise<void> {
//   if (messaging || !config.fcm.credentialsPath) return;
//   if (!fs.existsSync(config.fcm.credentialsPath)) return;

//   // const mod = await import("firebase-admin");
//   // Optional dependency — installed only in Phase 6 when FCM goes live.
//   // A non-literal specifier stops tsc from resolving it at build time.
//   const fbModule = "firebase-admin";
//   const mod = await import(fbModule);
//   const admin = (mod as { default?: unknown }).default ?? mod as unknown;
//   const a = admin as any;
//   const serviceAccount = JSON.parse(fs.readFileSync(config.fcm.credentialsPath, "utf8"));
//   if (a.apps.length === 0) {
//     a.initializeApp({ credential: a.credential.cert(serviceAccount) });
//   }
//   messaging = a.messaging();
// }

async function ensureInit(): Promise<void> {
  if (messaging || !config.fcm.credentialsPath) return;
  if (!fs.existsSync(config.fcm.credentialsPath)) return;

  // Non-literal specifiers so tsc doesn't resolve firebase-admin at build time.
  const appPath = "firebase-admin/app";
  const msgPath = "firebase-admin/messaging";
  const appMod: any = await import(appPath);
  const msgMod: any = await import(msgPath);
  const appApi = appMod.default ?? appMod;
  const msgApi = msgMod.default ?? msgMod;

  const serviceAccount = JSON.parse(fs.readFileSync(config.fcm.credentialsPath, "utf8"));
  const app = appApi.getApps().length
    ? appApi.getApp()
    : appApi.initializeApp({ credential: appApi.cert(serviceAccount) });

  messaging = msgApi.getMessaging(app);
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