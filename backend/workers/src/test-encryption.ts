// this file can be deleted. it is not needed anymore - 
// it is used phase 4 - step 2- part a


// import { generateDataKey } from "./services/kms";
// import { encryptField, decryptField } from "./services/encryption";

// async function main() {
//   // Borrow a real 256-bit key from KMS to test field crypto with.
//   const { plaintextDek } = await generateDataKey();

//   const secret = "Maryan Maryan / 619161860";
//   console.log("Original:  ", secret);

//   const encrypted = encryptField(secret, plaintextDek);
//   console.log("Encrypted: ", encrypted.slice(0, 50) + "...");

//   const decrypted = decryptField(encrypted, plaintextDek);
//   console.log("Decrypted: ", decrypted);
//   console.log("Round-trip:", decrypted === secret ? "YES ✓" : "NO ✗");

//   // Tamper check: corrupt one byte and confirm decryption REFUSES it.
//   const buf = Buffer.from(encrypted, "base64");
//   buf[buf.length - 1] ^= 0xff; // flip the bits of the last byte
//   try {
//     decryptField(buf.toString("base64"), plaintextDek);
//     console.log("Tamper check: FAILED — corrupted data decrypted ✗");
//   } catch {
//     console.log("Tamper check: rejected corrupted data ✓");
//   }
// }

// main().catch((e) => { console.error(e); process.exit(1); });