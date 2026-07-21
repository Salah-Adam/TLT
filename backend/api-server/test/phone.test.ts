import { describe, it, expect } from "vitest";
import { detectProvider } from "../src/utils/phone";

describe("detectProvider", () => {
  it("maps EVC Plus prefixes (25261 / 25277)", () => {
    expect(detectProvider("252610000000")).toBe("evcplus");
    expect(detectProvider("252770000000")).toBe("evcplus");
  });

  it("maps eDahab prefix (25262)", () => {
    expect(detectProvider("252620000000")).toBe("edahab");
  });

  it("returns null for an unknown prefix", () => {
    expect(detectProvider("252650000000")).toBeNull();
  });
});