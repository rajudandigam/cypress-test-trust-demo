# cypress-test-trust-demo

Compact flight-reservation demo for the CypressConf talk  
**When Tests Heal Themselves: Building Trust in AI-Generated Cypress Tests**.

Real browser → Express API → PostgreSQL journey:

**Search → select itinerary → server-priced quote → book → retrieve saved reservation → refresh receipt.**

The airline/payment provider is a deterministic in-process simulation (no external network).

## Fresh clone happy path

```bash
git clone https://github.com/rajudandigam/cypress-test-trust-demo.git
cd cypress-test-trust-demo
cp .env.example .env
npm ci
npm run db:up          # starts Postgres; creates demo + test DBs when missing
npm run db:migrate
npm run db:seed
npm run build
npm start              # http://127.0.0.1:3000
# other terminal:
npm run test:critical
```

Also useful: `npm run test:unit`, `npm run test:api`, `npm run test:policy`.

Seeded traveler: `alex@example.test` / `Password123!`  
Golden itinerary: **UA123** SFO→JFK on 2026-11-12, total **$428.00**.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run doctor` | Versions, DB reachability, setup gaps (no secrets) |
| `npm run db:up` | Start Postgres + ensure demo/test databases |
| `npm run db:migrate` / `db:seed` | Schema + synthetic catalog |
| `npm run dev` | Vite `:3000` + API `:3001` |
| `npm run build` / `npm start` | Built app on `:3000` (CI/E2E target) |
| `npm run test:unit` / `test:api` | Focused domain + API/DB tests |
| `npm run test:policy` | Critical import-graph policy |
| `npm run test:critical` | BOOK-001/002 + structured result verification |
| `npm run cy:open:adaptive` | Open adaptive config in Chrome (Cloud login) |
| `npm run test:adaptive` / `test:hybrid` | Native `cy.prompt` (requires Cloud) |
| `npm run demo:capture` / `demo:verify` | Matrix evidence capture + classification |
| `npm run demo:up -- --scenario healthy` | Built demo for a named scenario |

## Demonstration points

1. Native `cy.prompt` can adapt to a locator change (inspect actual targeting; do not invent healing).
2. A successfully executed shallow receipt test can miss the business contract; export preserves that weakness.
3. Reviewed static assertions + required CI (`ci-required`) block a defective PR when protection is enabled.

See [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) and [docs/CI_SETUP.md](docs/CI_SETUP.md).

## Reference

UI patterns adapted from [flight-search-demo](https://github.com/rajudandigam/flight-search-demo). Inventory: [demo/COPIED_FROM_REFERENCE.md](demo/COPIED_FROM_REFERENCE.md).
