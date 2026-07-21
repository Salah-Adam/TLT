import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildApp } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./db";

const app = buildApp();
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await app.close(); });

describe("register: phone number must be exactly 252(61|62|77) + 7 digits", () => {
  it("rejects a correctly-prefixed but too-short number", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { fullName: "Test User", phoneNumber: "25261123", password: "secret123" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts a valid 12-digit number", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { fullName: "Test User", phoneNumber: "252612345678", password: "secret123" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.phoneNumber).toBe("252612345678");
  });
});