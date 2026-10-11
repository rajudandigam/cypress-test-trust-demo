import { BOOKING_CONTRACT } from "../../contracts/booking-contract";
import { apiLogin } from "./session";

export function searchAndSelectUa123() {
  apiLogin();
  cy.visit("/");
  cy.getByTestId("from-input").clear().type(BOOKING_CONTRACT.from);
  cy.getByTestId("to-input").clear().type(BOOKING_CONTRACT.to);
  cy.getByTestId("depart-input").clear().type("2026-11-12");
  cy.intercept("POST", "/api/flights/search").as("search");
  cy.getByTestId("search-button").click();
  cy.wait("@search");
  cy.getByTestId(`flight-card-${BOOKING_CONTRACT.itineraryId}`).within(() => {
    cy.getByTestId("select-button").click();
  });
}

export function bookFromCheckout() {
  cy.intercept("POST", "/api/bookings").as("createBooking");
  cy.getByTestId("book-button").should("be.enabled").click();
  return cy.wait("@createBooking");
}
