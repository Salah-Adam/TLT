// Encryption round-trip — encryptField→decryptField (pure unit, fixed key) + search-by-phone blind-index hash

import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import { encryptField, decryptField, hashValue } from "../src/encryption";

describe("field encryption (AES-256-GCM)", () => {
  const key = randomBytes(32); // stand-in for a user DEK

  it("decrypts exactly what it encrypted", () => {
    const plaintext = "Cabdi Nuur 252612345678";
    const ct = encryptField(plaintext, key);
    expect(ct).not.toContain(plaintext);           // stored form isn't plaintext
    expect(decryptField(ct, key)).toBe(plaintext); // round-trips
  });

  it("refuses to decrypt with the wrong key (GCM auth tag catches tampering)", () => {
    const ct = encryptField("secret", key);
    expect(() => decryptField(ct, randomBytes(32))).toThrow();
  });

  it("hashValue is deterministic and one-way", () => {
    const h = hashValue("252612345678");
    expect(hashValue("252612345678")).toBe(h);      // same input → same hash (blind index works)
    expect(h).not.toContain("252612345678");        // doesn't leak the input
    expect(hashValue("252612345679")).not.toBe(h);  // different input → different hash
  });
});