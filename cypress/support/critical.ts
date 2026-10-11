import "./common/commands";

// Critical support entry — must never import adaptive helpers or call cy.prompt.
beforeEach(() => {
  cy.task("db:reset");
});
