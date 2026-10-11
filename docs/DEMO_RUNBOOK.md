# 12-minute demonstration runbook

Machine: built mode preferred (`npm run build && npm start`).  
Pre-run hosted CI for exact commits; live triggers must not control stage timing.

## 0:00–1:00 — Healthy reservation

**Command**
```bash
npm run demo:up -- --scenario healthy
# browser: http://127.0.0.1:3000
```
**Files:** receipt UI `src/client/pages/Receipt.tsx`  
**Narration:** “Same journey attendees can clone — search UA123, book, refresh.”  
**Expect:** Status pill `confirmed`, total `$428.00`, ID survives refresh.  
**Recovery:** `npm run demo:reset && npm run db:seed`

## 1:00–3:00 — Locator migration + prompt inspection

**Command**
```bash
# stop prior demo:up, then:
DEMO_SCENARIO=locator-change npm run demo:up -- --scenario locator-change
npm run cy:open  # adaptive config / Chrome; Cloud login required
```
**Files:** `cypress/e2e/adaptive/booking-shallow.cy.ts`, `src/domain/scenario.ts`  
**Narration:** “Select control moved from `data-cy` to `data-action` — inspect what native prompt actually targeted.”  
**Expect:** Label healing as **observed / no observed / unverified** from the run only.  
**Recovery:** If Cloud unavailable, show recording fallback; do not invent a heal.

## 3:00–5:00 — Shallow test vs pending-finalization

**Command**
```bash
npm run demo:up -- --scenario pending-finalization
# run Variant A or B against this scenario
```
**Narration:** “Receipt says Reservation created; status honestly shows pending.”  
**Expect:** Shallow receipt/reference assertions **pass**; DB row status `pending`.  
**Recovery:** Confirm `/api/health` reports `pending-finalization`.

## 5:00–8:00 — Hybrid contract assertions

**Files:** `cypress/e2e/adaptive/booking-hybrid.cy.ts` (short assert block)  
**Narration:** “Add the explicit confirmed-status check — same UI journey, stronger question.”  
**Expect:** Failure message includes `BOOKING_STATUS_MISMATCH`.  
**Recovery:** If failure is a timeout/selector/login issue, say so — that is **not** defect detection.

## 8:00–9:30 — Export review

**Files:** `demo/generated/` + comparison spec provenance header  
**Narration:** “Exporting the shallow test does not add the business assertion.”  
**Expect:** Show raw export vs reviewed diff; Variant B labeled truthfully.  
**Recovery:** If no real export yet, show handwritten baseline label and Cloud blocker.

## 9:30–12:00 — Required check blocks the defective PR

**Pre-run:** Open PR with `apply-demo-defect.ts defect` commit.  
**Narration:** “Unchanged critical suite; required check `ci-required` is red; merge blocked.”  
**Expect:** Real check URL + merge restriction for the demo actor; repair commit green.  
**Recovery:** If protections not configured, show local `test:critical` failure + CI_SETUP steps honestly.

## Recording fallback

If native AI/network delays: play pre-captured video from `demo/evidence/raw/` (gitignored large files). Manual capture: QuickTime screen recording of steps 1–5 before stage day.
