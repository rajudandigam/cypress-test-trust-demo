import { apiLogin } from "../../support/common/session";
import {
  BOOK_UA123_PLACEHOLDERS,
  BOOK_UA123_PROMPT_STEPS,
  registerBookingAliases,
} from "../../support/adaptive/shared-actions";

/**
 * Variant A — Adaptive interactions + shallow receipt assertion.
 * Intentionally omits final confirmed-state verification.
 */
describe("Adaptive shallow booking (limited scope)", () => {
  it("A-SHALLOW creates a receipt/reference without asserting confirmed status", () => {
    apiLogin();
    registerBookingAliases();
    cy.prompt([...BOOK_UA123_PROMPT_STEPS], {
      placeholders: { ...BOOK_UA123_PLACEHOLDERS },
    });
    cy.wait("@createBooking");
    cy.get('[data-cy="receipt-heading"]').should("contain", "Reservation created");
    cy.get('[data-cy="booking-id"]').should("not.be.empty");
  });
});
