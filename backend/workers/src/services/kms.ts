import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import { config } from "../config";

// One client, reused for every call. Creating a new client per call
// would waste connections and slow things down.
const kms = new KMSClient({ region: config.aws.region });

export interface GeneratedDataKey {
  plaintextDek: Buffer; // the raw 256-bit key — use immediately, then discard
  wrappedDek: string;   // the KMS-encrypted key — safe to store (base64)
}

/**
 * Mint a brand-new 256-bit data key from KMS.
 * KMS returns BOTH forms in a single call:
 *   - Plaintext      → the usable key (lives in memory only)
 *   - CiphertextBlob → the same key, wrapped by your master KEK
 * We store the wrapped form; we never store the plaintext.
 */
export async function generateDataKey(): Promise<GeneratedDataKey> {
  const command = new GenerateDataKeyCommand({
    KeyId: config.aws.kmsKeyId,
    KeySpec: "AES_256",
  });

  const response = await kms.send(command);

  if (!response.Plaintext || !response.CiphertextBlob) {
    throw new Error("KMS did not return a complete data key");
  }

  return {
    plaintextDek: Buffer.from(response.Plaintext),
    wrappedDek: Buffer.from(response.CiphertextBlob).toString("base64"),
  };
}

/**
 * Unwrap a previously-stored data key.
 * Input is the base64 string from user_encryption_keys.encrypted_dek.
 * Output is the raw 256-bit key, in memory only.
 */
export async function decryptDataKey(wrappedDekBase64: string): Promise<Buffer> {
  const command = new DecryptCommand({
    KeyId: config.aws.kmsKeyId,
    CiphertextBlob: Buffer.from(wrappedDekBase64, "base64"),
  });

  const response = await kms.send(command);

  if (!response.Plaintext) {
    throw new Error("KMS did not return a plaintext key on decrypt");
  }

  return Buffer.from(response.Plaintext);
}