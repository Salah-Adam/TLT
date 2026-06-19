import dotenv from 'dotenv'
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

dotenv.config()

// This function is the gatekeeper to ensure no environment variable is missing
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}


// This exported object is the contract. Any file in the service that needs the database host, or the Redis port, 
// imports config and reads config.database.host or config.redis.port.
export const config = {
  server: {
    port: parseInt(process.env.WEBHOOK_PORT || '3001', 10),
    host: '0.0.0.0',
  },
  database: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'TLT',
    user: process.env.DB_USER || 'TLT_user_sai',
    password: requireEnv('DB_PASSWORD'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
}