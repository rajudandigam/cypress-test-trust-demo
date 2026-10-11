# 12-minute demonstration runbook

Prepare before the stage clock: `npm ci`, `db:up`, migrate/seed, `build`, Cloud login if showing native prompt.

Validate scenario after each `demo:up`:
```bash
curl -s http://127.0.0.1:3000/api/health | tee /tmp/health.json
# expect status=ready and scenario=<intended>
```

Stop a previous owned demo with Ctrl+C in that terminal (do not kill arbitrary port occupants).

## 0:00–1:00 — Healthy reservation

```bash
DEMO_SCENARIO=healthy APP_IDENTITY=demo-stage npm run demo:up -- --scenario healthy
```
Browser: http://127.0.0.1:3000 — sign in as `alex@example.test` / `Password123!`, search SFO→JFK 2026-11-12, select **UA123**, book, refresh receipt.  
**Expect:** status `confirmed`, `$428.00`.  
**Recovery:** `DEMO_MODE=true npm run demo:reset && npm run db:seed`

## 1:00–3:00 — Locator migration + prompt inspection

```bash
# stop prior server, then:
DEMO_SCENARIO=locator-change APP_IDENTITY=demo-stage npm run demo:up -- --scenario locator-change
CYPRESS_PROJECT_ID=<your-id> npm run cy:open:adaptive
# run cypress/e2e/adaptive/booking-shallow.cy.ts
```
**Expect:** Inspect generated selector; label heal as observed / no observed / unverified.  
**Recovery:** If Cloud unavailable, play fallback recording; do not invent a heal.

## 3:00–5:00 — Shallow test vs pending-finalization

```bash
DEMO_SCENARIO=pending-finalization APP_IDENTITY=demo-stage npm run demo:up -- --scenario pending-finalization
# Variant A (Cloud):
CYPRESS_PROJECT_ID=<id> CYPRESS_RECORD_KEY=<secret> npm run test:adaptive
# or Variant B (static shallow, no Cloud):
DEMO_SCENARIO=pending-finalization APP_IDENTITY=demo-stage npx cypress run --config-file cypress.comparison.config.ts --spec cypress/e2e/comparison/booking-shallow-exported.cy.ts
```
**Expect:** Receipt/reference assertions pass; status pill shows `pending`.

## 5:00–8:00 — Hybrid contract assertions

```bash
# same pending-finalization server
CYPRESS_PROJECT_ID=<id> CYPRESS_RECORD_KEY=<secret> npm run test:hybrid
# or critical static D:
DEMO_SCENARIO=pending-finalization APP_IDENTITY=demo-stage npm run test:critical
```
**Expect:** Failure includes `BOOKING_STATUS_MISMATCH` on BOOK-001 / C-HYBRID.  
**Recovery:** If timeout/selector/login, say so — not defect detection.

## 8:00–9:30 — Export review

Open `demo/generated/` (raw export + reviewed diff) after a real `cy.prompt` export.  
Until then, Variant B remains labeled **handwritten-baseline**.

## 9:30–12:00 — Required check blocks defective PR

Use **pre-run** protected-PR evidence (new PR after ruleset activation), not a live CI wait.  
Narration: unchanged critical suite; `ci-required` red; merge blocked; repair green.

## Recording fallback

If native AI/network delays: play pre-captured clip from `demo/evidence/raw/` (gitignored). Manual capture: QuickTime of steps 1–5 before stage day.
