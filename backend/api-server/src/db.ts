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

// -------------------


// import { Pool, types } from "pg";
// import { config } from "./config";

// // PostgreSQL type OID 1082 = DATE.
// // By default, node-pg converts DATE values into JavaScript Date objects,
// // which shifts them to UTC midnight — wrong for EAT (UTC+3) dates.
// // This registers a custom parser that returns DATE as a plain "YYYY-MM-DD"
// // string instead, which is always correct regardless of the server timezone.
// types.setTypeParser(1082, (val: string) => val);

// export const pool = new Pool({
//   host:     config.db.host,
//   port:     config.db.port,
//   database: config.db.database,
//   user:     config.db.user,
//   password: config.db.password,
// });