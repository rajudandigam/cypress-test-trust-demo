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

/**
 * Return the stored monetary snapshot. Never recompute total from base+taxes alone —
 * inconsistent persisted totals must be rejected, not silently normalized.
 */
export function storedPriceSnapshot(row: Record<string, unknown>): PriceBreakdown {
  const baseCents = assertCents(Number(row.base_cents), "base_cents");
  const taxesFeesCents = assertCents(Number(row.taxes_fees_cents), "taxes_fees_cents");
  const totalCents = assertCents(Number(row.total_cents), "total_cents");
  const currency = String(row.currency ?? "");
  if (currency !== "USD") {
    throw Object.assign(new Error(`Unsupported currency snapshot: ${currency}`), {
      status: 500,
      code: "MONEY_INTEGRITY",
    });
  }
  if (totalCents !== baseCents + taxesFeesCents) {
    throw Object.assign(
      new Error(
        `Inconsistent money snapshot: total_cents=${totalCents} != base+taxes=${baseCents + taxesFeesCents}`,
      ),
      { status: 500, code: "MONEY_INTEGRITY" },
    );
  }
  return { baseCents, taxesFeesCents, totalCents, currency: "USD" };
}
