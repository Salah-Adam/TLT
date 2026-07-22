import { Pool, types } from "pg";
import { config } from "./config";

// OID 1082 = DATE → return "YYYY-MM-DD" instead of a UTC-midnight JS Date (EAT is UTC+3).
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  host:     config.database.host,
  port:     config.database.port,
  database: config.database.database,
  user:     config.database.user,
  password: config.database.password,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "tlt-webhook-server",
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export default pool;   // keep — services/auth.ts does `import pool from '../db'`



// /**
//  * The PostgreSQL connection pool for the webhook-server. 
//  * A pool is a set of pre-opened database connections that are reused across requests 
//  rather than opened and closed for every single query.
//  *  **/

// import { Pool } from 'pg'
// import { config } from './config'

// const pool = new Pool({
//   host: config.database.host,
//   port: config.database.port,
//   database: config.database.database,
//   user: config.database.user,
//   password: config.database.password,
//   max: 10,                // maximum 10 simultaneous connections
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// })

// pool.on('error', (err) => {
//   console.error('Unexpected error on idle PostgreSQL client', err)
// })

// export default pool