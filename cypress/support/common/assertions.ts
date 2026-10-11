import { BOOKING_CONTRACT } from "../../contracts/booking-contract";

export type BookingResource = {
  id: string;
  status: string;
  itineraryId: string;
  travelerId: string;
  travelerEmail: string;
  travelerName: string;
  fareCode: string;
  price: {
    totalCents: number;
    currency: string;
  };
  providerReference: string | null;
  itinerary: {
    flightNumber: string;
    from: string;
    to: string;
    departureAt: string;
  };
};

export function assertConfirmedBookingContract(booking: BookingResource) {
  expect(booking.id, "booking id must be nonempty").to.match(
    /^[0-9a-f-]{36}$/i,
  );

  expect(
    booking.status,
    "BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed after successful provider response",
  ).to.eq(BOOKING_CONTRACT.requiredStatus);

  expect(booking.itineraryId).to.eq(BOOKING_CONTRACT.itineraryId);
  expect(booking.itinerary.flightNumber).to.eq(BOOKING_CONTRACT.flightNumber);
  expect(booking.itinerary.from).to.eq(BOOKING_CONTRACT.from);
  expect(booking.itinerary.to).to.eq(BOOKING_CONTRACT.to);
  expect(new Date(booking.itinerary.departureAt).toISOString()).to.eq(
    BOOKING_CONTRACT.departureAt,
  );
  expect(booking.travelerId).to.eq(BOOKING_CONTRACT.travelerId);
  expect(booking.travelerEmail).to.eq(BOOKING_CONTRACT.travelerEmail);
  expect(booking.fareCode).to.eq(BOOKING_CONTRACT.fareCode);
  expect(booking.price.totalCents).to.eq(BOOKING_CONTRACT.totalCents);
  expect(booking.price.currency).to.eq(BOOKING_CONTRACT.currency);
  expect(booking.providerReference, "provider reference required when confirmed").to.be.a(
    "string",
  ).and.not.be.empty;
}

export function assertReceiptUiMatches(booking: BookingResource) {
  cy.get('[data-cy="receipt-heading"]').should("contain", "Reservation created");
  cy.get('[data-cy="booking-id"]').should("contain", booking.id);
  cy.get('[data-cy="booking-status"]').should(
    "contain",
    booking.status,
  );
  cy.get('[data-cy="booking-flight"]').should("contain", BOOKING_CONTRACT.flightNumber);
  cy.get('[data-cy="booking-total"]').should("contain", "428.00");
  cy.get('[data-cy="booking-traveler"]').should("contain", BOOKING_CONTRACT.travelerEmail);
}
