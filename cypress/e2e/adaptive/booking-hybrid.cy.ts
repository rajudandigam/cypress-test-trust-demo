import { BOOKING_CONTRACT } from "../../contracts/booking-contract";
import {
  assertConfirmedBookingContract,
  type BookingResource,
} from "../../support/common/assertions";
import { apiLogin } from "../../support/common/session";
import {
  BOOK_UA123_PROMPT_STEPS,
  registerBookingAliases,
} from "../../support/adaptive/shared-actions";

/**
 * Variant C — Adaptive interactions + explicit contract assertions (hybrid).
 */
describe("Hybrid adaptive booking contract", () => {
  it("C-HYBRID books via prompt then asserts the independent reservation contract", () => {
    apiLogin();
    registerBookingAliases();

    // Network aliases registered before the prompt may wait on them.
    cy.prompt([...BOOK_UA123_PROMPT_STEPS], {
      placeholders: {
        flightNumber: BOOKING_CONTRACT.flightNumber,
      },
    });

    // Explicit booking response inspection outside the prompt (do not re-wait @search).
    cy.get("@createBooking").then((interception) => {
      const booking = (
        interception as unknown as { response?: { body?: { booking: BookingResource } } }
      ).response?.body?.booking;
      expect(booking?.id, "created booking id").to.be.a("string").and.not.be.empty;

      cy.request(`/api/bookings/${booking!.id}`).then((response) => {
        const saved = response.body.booking as BookingResource;
        // Short visible contract block for live coding:
        expect(
          saved.status,
          "BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed after successful provider response",
        ).to.eq(BOOKING_CONTRACT.requiredStatus);
        assertConfirmedBookingContract(saved);
      });
    });
  });
});
