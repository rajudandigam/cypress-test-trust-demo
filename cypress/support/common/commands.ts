Cypress.Commands.add("getByTestId", (id: string) => {
  return cy.get(`[data-cy="${id}"]`);
});

declare global {
  namespace Cypress {
    interface Chainable {
      getByTestId(id: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
