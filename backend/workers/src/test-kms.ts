// this file can be deleted. it is not needed anymore - 
// it is used phase 4 - step 2- part a



// import { generateDataKey, decryptDataKey } from "./services/kms";

// async function main() {
//   console.log("1. Asking KMS for a new data key...");
//   const { plaintextDek, wrappedDek } = await generateDataKey();
//   console.log("   Plaintext DEK length:", plaintextDek.length, "bytes (expect 32)");
//   console.log("   Wrapped DEK (stored form):", wrappedDek.slice(0, 40) + "...");

//   console.log("2. Asking KMS to unwrap that same key...");
//   const unwrapped = await decryptDataKey(wrappedDek);

//   console.log(
//     "3. Original and unwrapped keys match?",
//     plaintextDek.equals(unwrapped) ? "YES ✓" : "NO ✗"
//   );
// }

// main().catch((err) => {
//   console.error("KMS test FAILED:", err);
//   process.exit(1);
// });3