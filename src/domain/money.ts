import type { PriceBreakdown } from "./types.js";

const MAX_CENTS = 100_000_000;

export function assertCents(value: number, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of cents`);
  }
  if (value < 0 || value > MAX_CENTS) {
    throw new Error(`${label} out of safe bounds`);
  }
  return value;
}

export function buildPrice(baseCents: number, taxesFeesCents: number): PriceBreakdown {
  const base = assertCents(baseCents, "baseCents");
  const taxes = assertCents(taxesFeesCents, "taxesFeesCents");
  const total = assertCents(base + taxes, "totalCents");
  return {
    baseCents: base,
    taxesFeesCents: taxes,
    totalCents: total,
    currency: "USD",
  };
}

export function formatUsdCents(cents: number): string {
  assertCents(cents, "cents");
  const dollars = Math.trunc(cents / 100);
  const rem = Math.abs(cents % 100);
  return `$${dollars}.${String(rem).padStart(2, "0")}`;
}
