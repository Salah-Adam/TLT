import { Pool } from "pg";
import { config } from "./config";

// A pool reuses a small set of connections across all queries,
// instead of opening a new connection every time. Created once,
// imported everywhere.
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});