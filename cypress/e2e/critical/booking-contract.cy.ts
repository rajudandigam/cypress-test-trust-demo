import { BOOKING_CONTRACT } from "../../contracts/booking-contract";
import {
  assertConfirmedBookingContract,
  assertReceiptUiMatches,
  type BookingResource,
} from "../../support/common/assertions";
import { bookFromCheckout, searchAndSelectUa123 } from "../../support/common/booking-flow";

describe("Critical booking contract", () => {
  it("BOOK-001 confirms the selected itinerary for the authenticated traveler at the quoted total", () => {
    searchAndSelectUa123();
    cy.url().should("include", "/checkout");
    cy.getByTestId("checkout-flight").should("contain", BOOKING_CONTRACT.flightNumber);
    cy.getByTestId("checkout-total").should("contain", "428.00");

    bookFromCheckout().then((interception) => {
      expect([200, 201]).to.include(interception.response?.statusCode);
      const booking = interception.response?.body?.booking as BookingResource;
      expect(booking?.id, "created booking id").to.be.a("string").and.not.be.empty;

      cy.request({
        method: "GET",
        url: `/api/bookings/${booking.id}`,
      }).then((response) => {
        expect(response.status).to.eq(200);
        const saved = response.body.booking as BookingResource;
        assertConfirmedBookingContract(saved);
        cy.url().should("include", `/bookings/${saved.id}`);
        assertReceiptUiMatches(saved);
      });
    });
  });

  it("BOOK-002 the reservation remains correct after direct navigation/refresh of its receipt", () => {
    searchAndSelectUa123();
    bookFromCheckout().then((interception) => {
      const booking = interception.response?.body?.booking as BookingResource;
      const bookingId = booking.id;

      cy.visit(`/bookings/${bookingId}`);
      cy.reload();

      cy.request(`/api/bookings/${bookingId}`).then((response) => {
        const saved = response.body.booking as BookingResource;
        assertConfirmedBookingContract(saved);
        assertReceiptUiMatches(saved);
        cy.getByTestId("booking-id").should("contain", bookingId);
      });
    });
  });
});
