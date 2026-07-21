import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../src/db";
import { issueChallenge } from "../src/otp";
import { resetDb } from "./db";

const PHONE = "252617778888";
beforeEach(async () => { await resetDb(); });

describe("OTP throttle", () => {
  it("blocks a second request inside the 60s cooldown", async () => {
    await issueChallenge({ purpose: "registration", phoneNumber: PHONE });
    await expect(
      issueChallenge({ purpose: "registration", phoneNumber: PHONE })
    ).rejects.toHaveProperty("code", "OTP_RESEND_COOLDOWN");
  });

  it("caps requests per rolling window", async () => {
    // 5 allowed; backdate last_sent_at each time to skip the cooldown.
    for (let i = 0; i < 5; i++) {
      await issueChallenge({ purpose: "registration", phoneNumber: PHONE });
      await pool.query(
        `UPDATE otp_challenges SET last_sent_at = last_sent_at - INTERVAL '2 minutes'
         WHERE phone_number=$1 AND purpose='registration' AND consumed_at IS NULL`, [PHONE]
      );
    }
    await expect(
      issueChallenge({ purpose: "registration", phoneNumber: PHONE })
    ).rejects.toHaveProperty("code", "OTP_TOO_MANY_REQUESTS");
  });
});