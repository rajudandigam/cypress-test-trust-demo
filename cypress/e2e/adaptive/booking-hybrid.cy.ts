import { BOOKING_CONTRACT } from "../../contracts/booking-contract";
import {
  assertConfirmedBookingContract,
  type BookingResource,
} from "../../support/common/assertions";
import { apiLogin } from "../../support/common/session";
import {
  BOOK_UA123_PLACEHOLDERS,
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

    cy.prompt([...BOOK_UA123_PROMPT_STEPS], {
      placeholders: { ...BOOK_UA123_PLACEHOLDERS },
    });

    cy.wait("@createBooking").then((interception) => {
      const booking = interception.response?.body?.booking as BookingResource;
      expect(booking?.id, "created booking id").to.be.a("string").and.not.be.empty;

      cy.request(`/api/bookings/${booking!.id}`).then((response) => {
        const saved = response.body.booking as BookingResource;
        expect(
          saved.status,
          "BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed after successful provider response",
        ).to.eq(BOOKING_CONTRACT.requiredStatus);
        assertConfirmedBookingContract(saved);
      });
    });
  });
});
