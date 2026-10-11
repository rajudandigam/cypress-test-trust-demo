import { describe, expect, it } from "vitest";
import { assertCents, buildPrice, formatUsdCents } from "../../src/domain/money.js";

describe("money", () => {
  it("builds exact totals from integer cents", () => {
    expect(buildPrice(40000, 2800)).toEqual({
      baseCents: 40000,
      taxesFeesCents: 2800,
      totalCents: 42800,
      currency: "USD",
    });
  });

  it("formats without float rounding", () => {
    expect(formatUsdCents(42800)).toBe("$428.00");
    expect(formatUsdCents(1)).toBe("$0.01");
  });

  it("rejects non-integers", () => {
    expect(() => assertCents(1.5, "x")).toThrow(/integer/);
  });
});
