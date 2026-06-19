import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  server: {
    port: Number(process.env.API_SERVER_PORT ?? 3002),
    host: process.env.HOST ?? "0.0.0.0",
  },
  db: {
    host:     required("DB_HOST"),
    port:     Number(process.env.DB_PORT ?? 5432),
    database: required("DB_NAME"),
    user:     required("DB_USER"),
    password: required("DB_PASSWORD"),
  },
  jwt: {
    secret:              required("JWT_SECRET"),
    accessExpiresIn:     process.env.JWT_ACCESS_EXPIRES_IN  ?? "15m",
    refreshExpiresIn:    process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
    refreshAbsoluteDays: Number(process.env.JWT_REFRESH_ABSOLUTE_DAYS ?? 90),
  },
  aws: {
    region:     required("AWS_REGION"),
    kmsKeyId:   required("AWS_KMS_KEY_ID"),
    kekVersion: process.env.KEK_VERSION ?? "v1",
  },
  hmacSecret: required("HMAC_SECRET"),
};




// // import dotenv from "dotenv";
// // dotenv.config();
// import dotenv from "dotenv";
// import path from "path";
// dotenv.config({ path: path.resolve(__dirname, "../../../.env") });


// function required(name: string): string {
//   const value = process.env[name];
//   if (!value) {
//     throw new Error(`Missing required environment variable: ${name}`);
//   }
//   return value;
// }

// export const config = {
//   server: {
//     port: Number(process.env.PORT ?? 3002),
//     host: process.env.HOST ?? "0.0.0.0",
//   },
//   db: {
//     host:     required("DB_HOST"),
//     port:     Number(process.env.DB_PORT ?? 5432),
//     database: required("DB_NAME"),
//     user:     required("DB_USER"),
//     password: required("DB_PASSWORD"),
//   },
//   jwt: {
//     secret:              required("JWT_SECRET"),
//     accessExpiresIn:     process.env.JWT_ACCESS_EXPIRES_IN  ?? "15m",
//     refreshExpiresIn:    process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
//     refreshAbsoluteDays: Number(process.env.JWT_REFRESH_ABSOLUTE_DAYS ?? 90),
//   },
// };