export type BookingStatus = "pending" | "confirmed" | "failed";

export type Money = {
  amountCents: number;
  currency: "USD";
};

export type PriceBreakdown = {
  baseCents: number;
  taxesFeesCents: number;
  totalCents: number;
  currency: "USD";
};

export type FlightItinerary = {
  id: string;
  flightNumber: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  fareCode: string;
  baseCents: number;
  taxesFeesCents: number;
  totalCents: number;
  currency: "USD";
  carrier: string;
  stops: number;
  durationMins: number;
};

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  travelerId: string;
};

export type QuoteView = {
  id: string;
  itineraryId: string;
  itinerary: FlightItinerary;
  passengerCount: number;
  price: PriceBreakdown;
  expiresAt: string;
};

export type BookingView = {
  id: string;
  status: BookingStatus;
  quoteId: string;
  itineraryId: string;
  itinerary: FlightItinerary;
  travelerId: string;
  travelerEmail: string;
  travelerName: string;
  fareCode: string;
  price: PriceBreakdown;
  providerReference: string | null;
  createdAt: string;
};

export const DEMO_SCENARIOS = [
  "healthy",
  "style-change",
  "locator-change",
  "pending-finalization",
] as const;

export type DemoScenario = (typeof DEMO_SCENARIOS)[number];
