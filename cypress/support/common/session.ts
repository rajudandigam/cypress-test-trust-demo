import { BOOKING_CONTRACT } from "../../contracts/booking-contract";

export function apiLogin(
  email = BOOKING_CONTRACT.travelerEmail,
  password = BOOKING_CONTRACT.seedPassword,
) {
  return cy.request({
    method: "POST",
    url: "/api/session",
    body: { email, password },
  });
}

export function resetDemoDb() {
  return cy.task("db:reset");
}
