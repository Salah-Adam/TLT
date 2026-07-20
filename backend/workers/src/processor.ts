import { parsePayload } from "./services/parser";
import { encryptField, hashValue, getUserDek } from "./services/encryption";
import { pool } from "./db";

// import { updateDailySummary, updateMonthlySummary } from "./services/summaries";

import { recomputeDailySummary, recomputeMonthlySummary } from "./services/summaries";

import { updateTrackedContact } from "./services/tracking";
import { enqueueTransactionNotification } from "./services/notifications";
import { NormalisedStructuredJob } from "./types/job";

const DB_TYPE: Record<string, string> = {
  send: "send", receive: "receive", payment: "payment", bank_deposit: "deposit",
};
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // Somalia = UTC+3, no DST

export async function processTransactionJob(job: NormalisedStructuredJob): Promise<void> {
  const r = await parsePayload(job.provider, job.structuredPayload, job.receivedAt);

  if (!r.direction || !r.type || r.amount == null || r.amount <= 0) {
    throw new Error(`Unmappable ParseResult: dir=${r.direction} type=${r.type} amount=${r.amount}`);
  }

  const raw = r.timestamp ?? job.receivedAt;
  const utc = new Date(/Z$|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw + "Z");
  const local = new Date(utc.getTime() + EAT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const summaryDate = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const transactedHour = local.getUTCHours();
  const transactedDow = local.getUTCDay();
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;

  const dek = await getUserDek(job.userId);
  const nameEnc = r.counterparty_name ? encryptField(r.counterparty_name, dek) : null;
  const phoneEnc = r.counterparty_number ? encryptField(r.counterparty_number, dek) : null;
  const phoneHash = r.counterparty_number ? hashValue(r.counterparty_number) : null;
  const rawEnc = encryptField(r.raw_message, dek);

  const idempotencyKey = r.reference
    ? `${job.provider}:${r.reference}`
    : `${job.provider}:${job.phoneNumberId}:${utc.getTime()}`;

  const dbType = DB_TYPE[r.type] ?? r.type;
  const isIn = r.direction === "in";

  let insertedId: string | null = null;
  let matched = false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ins = await client.query(
      `INSERT INTO transactions (
         phone_number_id, user_id, provider,
         amount, currency, type, direction, balance_after, service_charge,
         transacted_at, transacted_date, transacted_hour, transacted_day_of_week,
         counterparty_name_enc, counterparty_phone_enc, counterparty_phone_hash,
         provider_reference, raw_sms_enc, idempotency_key
       ) VALUES (
         $1,$2,$3, $4,$5,$6,$7,$8,$9,
         $10,$11,$12,$13, $14,$15,$16, $17,$18,$19
       )
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        job.phoneNumberId, job.userId, job.provider,
        r.amount, r.currency, dbType, r.direction, r.balance, r.service_charge,
        utc.toISOString(), summaryDate, transactedHour, transactedDow,
        nameEnc, phoneEnc, phoneHash,
        r.reference, rawEnc, idempotencyKey,
      ]
    );

    if (ins.rowCount === 0) {
      await client.query("COMMIT");
      console.log(`  duplicate (${idempotencyKey}) — skipped, summaries untouched`);
      return;
    }

    insertedId = ins.rows[0].id;

    // await updateDailySummary(client, {
    //   phoneNumberId: job.phoneNumberId, userId: job.userId,
    //   summaryDate, isIn, amount: r.amount, balanceAfter: r.balance,
    // });
    // await updateMonthlySummary(client, {
    //   phoneNumberId: job.phoneNumberId, userId: job.userId,
    //   year, month, isIn, amount: r.amount,
    // });

    await recomputeDailySummary(client, job.userId, job.phoneNumberId, summaryDate);
    await recomputeMonthlySummary(client, job.userId, job.phoneNumberId, year, month);

    matched = await updateTrackedContact(client, {
      userId: job.userId, phoneHash, isOut: !isIn,
      amount: r.amount, transactedAt: utc.toISOString(),
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Transaction is durably committed. Now queue the push (best-effort).
  await enqueueTransactionNotification({
    userId: job.userId,
    transactionId: insertedId!,
    direction: isIn ? "in" : "out",
    amount: r.amount,
    currency: r.currency,
    balanceAfter: r.balance,
  });

  console.log(`  inserted ${insertedId} + summaries${matched ? " + tracked contact" : ""} + notification queued`);
}



// -------------------------------------------------------------


// import { parsePayload } from "./services/parser";
// import { encryptField, hashValue, getUserDek } from "./services/encryption";
// import { pool } from "./db";
// import { updateDailySummary, updateMonthlySummary } from "./services/summaries";
// import { NormalisedStructuredJob } from "./types/job";
// import { updateTrackedContact } from "./services/tracking";

// const DB_TYPE: Record<string, string> = {
//   send: "send", receive: "receive", payment: "payment", bank_deposit: "deposit",
// };
// const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // Somalia = UTC+3, no DST

// export async function processTransactionJob(job: NormalisedStructuredJob): Promise<void> {
//   const r = await parsePayload(job.provider, job.structuredPayload, job.receivedAt);

//   if (!r.direction || !r.type || r.amount == null || r.amount <= 0) {
//     throw new Error(`Unmappable ParseResult: dir=${r.direction} type=${r.type} amount=${r.amount}`);
//   }

//   const raw = r.timestamp ?? job.receivedAt;
//   const utc = new Date(/Z$|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw + "Z");
//   const local = new Date(utc.getTime() + EAT_OFFSET_MS);
//   const pad = (n: number) => String(n).padStart(2, "0");
//   const summaryDate = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
//   const transactedHour = local.getUTCHours();
//   const transactedDow = local.getUTCDay();
//   const year = local.getUTCFullYear();
//   const month = local.getUTCMonth() + 1;

//   const dek = await getUserDek(job.userId);
//   const nameEnc = r.counterparty_name ? encryptField(r.counterparty_name, dek) : null;
//   const phoneEnc = r.counterparty_number ? encryptField(r.counterparty_number, dek) : null;
//   const phoneHash = r.counterparty_number ? hashValue(r.counterparty_number) : null;
//   const rawEnc = encryptField(r.raw_message, dek);

//   const idempotencyKey = r.reference
//     ? `${job.provider}:${r.reference}`
//     : `${job.provider}:${job.phoneNumberId}:${utc.getTime()}`;

//   const dbType = DB_TYPE[r.type] ?? r.type;
//   const isIn = r.direction === "in";

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const ins = await client.query(
//       `INSERT INTO transactions (
//          phone_number_id, user_id, provider,
//          amount, currency, type, direction, balance_after, service_charge,
//          transacted_at, transacted_date, transacted_hour, transacted_day_of_week,
//          counterparty_name_enc, counterparty_phone_enc, counterparty_phone_hash,
//          provider_reference, raw_sms_enc, idempotency_key
//        ) VALUES (
//          $1,$2,$3, $4,$5,$6,$7,$8,$9,
//          $10,$11,$12,$13, $14,$15,$16, $17,$18,$19
//        )
//        ON CONFLICT (idempotency_key) DO NOTHING
//        RETURNING id`,
//       [
//         job.phoneNumberId, job.userId, job.provider,
//         r.amount, r.currency, dbType, r.direction, r.balance, r.service_charge,
//         utc.toISOString(), summaryDate, transactedHour, transactedDow,
//         nameEnc, phoneEnc, phoneHash,
//         r.reference, rawEnc, idempotencyKey,
//       ]
//     );

//     if (ins.rowCount === 0) {
//       await client.query("COMMIT");
//       console.log(`  duplicate (${idempotencyKey}) — skipped, summaries untouched`);
//       return;
//     }

//     await updateDailySummary(client, {
//       phoneNumberId: job.phoneNumberId, userId: job.userId,
//       summaryDate, isIn, amount: r.amount, balanceAfter: r.balance,
//     });
//     await updateMonthlySummary(client, {
//       phoneNumberId: job.phoneNumberId, userId: job.userId,
//       year, month, isIn, amount: r.amount,
//     });

//     const matched = await updateTrackedContact(client, {
//       userId: job.userId,
//       phoneHash,
//       isOut: !isIn,
//       amount: r.amount,
//       transactedAt: utc.toISOString(),
//     });

//     await client.query("COMMIT");
//     console.log(`  inserted ${ins.rows[0].id} + summaries${matched ? " + tracked contact" : ""}`);
 
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// }







// --------------------------------------------------------------------

// import { parsePayload } from "./services/parser";
// import { encryptField, hashValue, getUserDek } from "./services/encryption";
// import { pool } from "./db";
// import { NormalisedStructuredJob } from "./types/job";

// // transactions.chk_type has no 'bank_deposit'; map it to 'deposit'.
// const DB_TYPE: Record<string, string> = {
//   send: "send",
//   receive: "receive",
//   payment: "payment",
//   bank_deposit: "deposit",
// };

// const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // Somalia = UTC+3, no DST

// export async function processTransactionJob(job: NormalisedStructuredJob): Promise<void> {
//   // 1. Send the structured payload to the parser.
//   const r = await parsePayload(job.provider, job.structuredPayload, job.receivedAt);

//   // Fail fast with a clear message if the result can't satisfy the table's
//   // NOT NULL / CHECK rules — better than a cryptic Postgres error.
//   if (!r.direction || !r.type || r.amount == null || r.amount <= 0) {
//     throw new Error(
//       `Unmappable ParseResult: dir=${r.direction} type=${r.type} amount=${r.amount}`
//     );
//   }

//   // 2. Derive local (EAT) date/hour/day-of-week; store the UTC instant.
//   const raw = r.timestamp ?? job.receivedAt;
//   const utc = new Date(/Z$|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw + "Z");
//   const local = new Date(utc.getTime() + EAT_OFFSET_MS);
//   const pad = (n: number) => String(n).padStart(2, "0");
//   const transactedDate = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
//   const transactedHour = local.getUTCHours();
//   const transactedDow = local.getUTCDay(); // 0 = Sunday

//   // 3. Encrypt sensitive fields with this user's DEK.
//   const dek = await getUserDek(job.userId);
//   const nameEnc = r.counterparty_name ? encryptField(r.counterparty_name, dek) : null;
//   const phoneEnc = r.counterparty_number ? encryptField(r.counterparty_number, dek) : null;
//   const phoneHash = r.counterparty_number ? hashValue(r.counterparty_number) : null;
//   const rawEnc = encryptField(r.raw_message, dek);

//   // 4. Idempotency key — provider + the provider's own transaction id.
//   const idempotencyKey = r.reference
//     ? `${job.provider}:${r.reference}`
//     : `${job.provider}:${job.phoneNumberId}:${utc.getTime()}`;

//   // 5. Map parser type to a DB-valid type.
//   const dbType = DB_TYPE[r.type] ?? r.type;

//   // 6. Insert — idempotent: a retried webhook produces no duplicate.
//   const result = await pool.query(
//     `INSERT INTO transactions (
//        phone_number_id, user_id, provider,
//        amount, currency, type, direction, balance_after, service_charge,
//        transacted_at, transacted_date, transacted_hour, transacted_day_of_week,
//        counterparty_name_enc, counterparty_phone_enc, counterparty_phone_hash,
//        provider_reference, raw_sms_enc, idempotency_key
//      ) VALUES (
//        $1,$2,$3, $4,$5,$6,$7,$8,$9,
//        $10,$11,$12,$13, $14,$15,$16, $17,$18,$19
//      )
//      ON CONFLICT (idempotency_key) DO NOTHING
//      RETURNING id`,
//     [
//       job.phoneNumberId, job.userId, job.provider,
//       r.amount, r.currency, dbType, r.direction, r.balance, r.service_charge,
//       utc.toISOString(), transactedDate, transactedHour, transactedDow,
//       nameEnc, phoneEnc, phoneHash,
//       r.reference, rawEnc, idempotencyKey,
//     ]
//   );

//   if (result.rowCount === 0) {
//     console.log(`  duplicate (${idempotencyKey}) — skipped`);
//     return;
//   }
//   console.log(`  inserted transaction ${result.rows[0].id}`);
// }