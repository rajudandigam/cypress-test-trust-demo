/**
 * Independent reviewed expectations for the golden booking scenario.
 * Do not import application pricing calculation modules here.
 */
export const BOOKING_CONTRACT = {
  tenantId: "tenant-demo",
  travelerId: "traveler-demo",
  travelerEmail: "alex@example.test",
  travelerName: "Alex Traveler",
  itineraryId: "flight-ua123-20261112",
  flightNumber: "UA123",
  from: "SFO",
  to: "JFK",
  departureAt: "2026-11-12T16:00:00.000Z",
  arrivalAt: "2026-11-12T21:30:00.000Z",
  fareCode: "ECONOMY_STANDARD",
  passengerCount: 1,
  baseCents: 40000,
  taxesFeesCents: 2800,
  totalCents: 42800,
  currency: "USD",
  requiredStatus: "confirmed",
  seedPassword: "Password123!",
} as const;

export const REQUIRED_TEST_IDENTITIES = ["BOOK-001", "BOOK-002"] as const;

export const REQUIRED_SPEC_PATHS = [
  "cypress/e2e/critical/booking-contract.cy.ts",
] as const;
