import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app";

const app = buildApp();
afterAll(async () => {
  await app.close();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", service: "api-server" });
  });
});