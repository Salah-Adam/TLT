import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

dotenv.config();


function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}


export const config = {
  aws: {
    region: required("AWS_REGION"),
    kmsKeyId: required("AWS_KMS_KEY_ID"),
    kekVersion: process.env.KEK_VERSION ?? "v1",
  },
  db: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 5432),
    database: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
  },
  redis: {
    host: required("REDIS_HOST"),
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  parser: {
    url: process.env.PARSER_URL ?? "http://localhost:8000",
  },

  hmacSecret: required("HMAC_SECRET"),

  fcm: {
    credentialsPath: process.env.FCM_CREDENTIALS_PATH ?? null,
  },
};

