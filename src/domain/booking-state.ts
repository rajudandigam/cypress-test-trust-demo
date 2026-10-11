import type { BookingStatus } from "./types.js";

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  if (from === "pending" && (to === "confirmed" || to === "failed")) return true;
  return false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking status transition ${from} -> ${to}`);
  }
}
