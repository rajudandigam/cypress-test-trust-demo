import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../../src/domain/booking-state.js";

describe("booking status transitions", () => {
  it("allows pending to confirmed", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(() => assertTransition("pending", "confirmed")).not.toThrow();
  });

  it("rejects confirmed to pending", () => {
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(() => assertTransition("confirmed", "pending")).toThrow(/Invalid/);
  });
});
