import { Pool, types } from "pg";
import { config } from "./config";

// OID 1082 = DATE → return "YYYY-MM-DD" instead of a UTC-midnight JS Date (EAT is UTC+3).
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,

  max: 10,                        // max simultaneous connections from THIS service
  idleTimeoutMillis: 30_000,      // release idle connections after 30s
  connectionTimeoutMillis: 5_000, // give up waiting for a free connection after 5s

  application_name: "tlt-api-server", // identifies this service in pg_stat_activity
});

// REQUIRED: without this listener, an error on an idle client (Postgres restart,
// network blip) surfaces as an uncaught 'error' event and can crash the process.
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

