# Copied / adapted from flight-search-demo

Reference checkout: `/Users/dand/Dev/flight-search-demo`  
Reviewed remote commit: `5724318ae5544fdec299685cdf6aa5d51b5f1af9`

| New file | Reference inspiration | Notes |
|----------|----------------------|-------|
| `src/client/pages/Home.tsx` | `SearchForm.tsx` | Reused `data-cy` names and a11y labels; wired to real session/search |
| `src/client/components/FlightCard.tsx` | `FlightCard.tsx` | Card-scoped Select; no remote airline logos |
| `src/client/pages/Results.tsx` | `Results.tsx` | Real API search + server quote |
| `src/client/pages/Checkout.tsx` | `Checkout.tsx` | Real book action + Idempotency-Key |
| `cypress/support/common/commands.ts` | `getByTestId` helper | Same `[data-cy=…]` convention |

**Not carried forward:** MSW handlers, dual fixture generators, Storybook, stubbed booking success, component-testing Cypress layout under `src/cypress/`.
