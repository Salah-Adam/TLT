// this file can be deleted. it is not needed anymore - 
// it is used phase 4 - step 2- part a



// import { pool } from "./db";
// import {
//   createUserDek,
//   getUserDek,
//   encryptField,
//   decryptField,
//   clearDekCache,
// } from "./services/encryption";

// async function main() {
//   const suffix = Date.now();
//   let userId: string | undefined;

//   try {
//     console.log("1. Creating a throwaway user...");
//     const insert = await pool.query(
//       `INSERT INTO users (username, email, password_hash)
//        VALUES ($1, $2, $3) RETURNING id`,
//       [`test_${suffix}`, `test_${suffix}@example.com`, "not_a_real_hash"]
//     );
//     userId = insert.rows[0].id;
//     console.log("   user id:", userId);

//     console.log("2. createUserDek — generate + store this user's DEK...");
//     const dekAtCreation = await createUserDek(userId);
//     console.log("   DEK length:", dekAtCreation.length, "bytes (expect 32)");

//     const secret = "Cabdullaahi / 615551234";
//     const enc = encryptField(secret, dekAtCreation);

//     console.log("3. getUserDek WARM (from cache) + decrypt...");
//     const dekWarm = await getUserDek(userId);
//     console.log("   warm decrypt:", decryptField(enc, dekWarm) === secret ? "YES ✓" : "NO ✗");

//     console.log("4. Clear cache -> getUserDek COLD (DB + KMS) + decrypt...");
//     clearDekCache(userId);
//     const dekCold = await getUserDek(userId);
//     console.log("   cold decrypt:", decryptField(enc, dekCold) === secret ? "YES ✓" : "NO ✗");
//     console.log("   warm key == cold key:", dekWarm.equals(dekCold) ? "YES ✓" : "NO ✗");

//     console.log("5. Exactly one key row for this user?");
//     const keys = await pool.query(
//       `SELECT kek_version FROM user_encryption_keys WHERE user_id = $1`,
//       [userId]
//     );
//     console.log("   rows:", keys.rowCount, "| kek_version:", keys.rows[0]?.kek_version);
//   } finally {
//     if (userId) {
//       console.log("6. Cleaning up test rows...");
//       await pool.query(`DELETE FROM user_encryption_keys WHERE user_id = $1`, [userId]);
//       await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
//       console.log("   removed.");
//     }
//     await pool.end();
//   }
// }

// main().catch((e) => {
//   console.error("Check 2 FAILED:", e);
//   process.exit(1);
// });