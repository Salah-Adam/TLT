import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import { config } from "./config";

const kms = new KMSClient({ region: config.aws.region });

export interface GeneratedDataKey {
  plaintextDek: Buffer;
  wrappedDek: string;
}

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