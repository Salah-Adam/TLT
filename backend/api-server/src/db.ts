import { Pool, types } from "pg";
import { config } from "./config";

// PostgreSQL type OID 1082 = DATE.
// By default, node-pg converts DATE values into JavaScript Date objects,
// which shifts them to UTC midnight — wrong for EAT (UTC+3) dates.
// This registers a custom parser that returns DATE as a plain "YYYY-MM-DD"
// string instead, which is always correct regardless of the server timezone.
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,
});