import { BOOKING_CONTRACT } from "../../contracts/booking-contract";
import { apiLogin } from "../../support/common/session";

/**
 * Variant B — Exported/static shallow interactions + shallow receipt assertion.
 *
 * PROVENANCE: handwritten-baseline (not an AI export).
 * Replace this file with a genuine Cypress Code/export artifact after an actual
 * cy.prompt run, retaining the original export under demo/generated/.
 * Exporting a shallow test does not improve its coverage.
 */
describe("Comparison shallow exported booking (handwritten baseline)", () => {
  it("B-SHALLOW-EXPORT checks receipt/reference existence only", () => {
    apiLogin();
    cy.intercept("POST", "/api/flights/search").as("search");
    cy.intercept("POST", "/api/bookings").as("createBooking");

    cy.visit("/");
    cy.get('[data-cy="from-input"]').clear().type(BOOKING_CONTRACT.from);
    cy.get('[data-cy="to-input"]').clear().type(BOOKING_CONTRACT.to);
    cy.get('[data-cy="depart-input"]').clear().type("2026-11-12");
    cy.get('[data-cy="search-button"]').click();
    cy.wait("@search");
    cy.get(`[data-cy="flight-card-${BOOKING_CONTRACT.itineraryId}"]`).within(() => {
      cy.get('[data-cy="select-button"]').click();
    });
    cy.get('[data-cy="book-button"]').click();
    cy.wait("@createBooking");

    cy.get('[data-cy="receipt-heading"]').should("contain", "Reservation created");
    cy.get('[data-cy="booking-id"]').should("be.visible").and("not.be.empty");
    // Intentionally no status === confirmed assertion.
  });
});
