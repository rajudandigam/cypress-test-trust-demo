import { BOOKING_CONTRACT } from "../../contracts/booking-contract";

/**
 * Shared natural-language booking actions for adaptive + hybrid variants.
 * Identifies UA123 explicitly — never "the first available flight".
 */
export const BOOK_UA123_PROMPT_STEPS = [
  'visit "/"',
  `type "${BOOKING_CONTRACT.from}" in the From field`,
  `type "${BOOKING_CONTRACT.to}" in the To field`,
  'type "2026-11-12" in the Depart field',
  'click the "Search flights" button',
  'wait for @search',
  `click the Select button inside the itinerary card for ${BOOKING_CONTRACT.flightNumber}`,
  'click the "Book flight" button',
  'wait for @createBooking',
  'verify the heading "Reservation created" is visible',
  'verify the reservation reference is visible',
] as const;

export function registerBookingAliases() {
  cy.intercept("POST", "/api/flights/search").as("search");
  cy.intercept("POST", "/api/bookings").as("createBooking");
}
