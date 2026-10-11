/**
 * Shared natural-language booking actions for adaptive + hybrid variants.
 * Identifies the UA123 itinerary explicitly — never "the first available flight".
 */
export const BOOK_UA123_PROMPT_STEPS = [
  'visit "/"',
  'clear the From field and type {{from}}',
  'clear the To field and type {{to}}',
  'clear the Depart field and type {{departDate}}',
  'click the "Search flights" button',
  'wait for @search',
  'click the Select button inside the itinerary card for flight {{flightNumber}}',
  'click the "Book flight" button',
  'verify the heading "Reservation created" is visible',
  'verify the reservation reference is visible',
] as const;

export const BOOK_UA123_PLACEHOLDERS = {
  from: "SFO",
  to: "JFK",
  departDate: "2026-11-12",
  flightNumber: "UA123",
} as const;

export function registerBookingAliases() {
  cy.intercept("POST", "/api/flights/search").as("search");
  cy.intercept("POST", "/api/bookings").as("createBooking");
}
