# Progress

## Reference status

- Path: `/Users/dand/Dev/flight-search-demo`
- HEAD before/after: `5724318ae5544fdec299685cdf6aa5d51b5f1af9` (unchanged)
- Dirty: untracked `cypress_conf.code-workspace` only

## Target

- Path: `/Users/dand/Dev/cypress-test-trust-demo`
- Remote: https://github.com/rajudandigam/cypress-test-trust-demo
- Healthy main commit: `24786ab`

## P0

| Milestone | Status | Evidence |
|-----------|--------|----------|
| P0.1 Skeleton | verified locally | Node 24.12.0, Cypress 16.1.1, Postgres 16.15 |
| P0.2 Healthy journey | verified locally | Confirmed booking + receipt refresh |
| P0.3 Critical tests | verified locally | unit/api/policy/critical pass |
| P0.4 Required CI | verified in CI | [ci-required green on main](https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38104081711) |

## P1

| Milestone | Status | Notes |
|-----------|--------|-------|
| P1.1 Native cy.prompt | blocked by external setup | `CLOUD_PREREQUISITE_MISSING` — not mocked |
| P1.2 Scenarios + defect | verified in CI (defect) | PR #1 defect run failed on `BOOKING_STATUS_MISMATCH` |
| P1.3 Hybrid/export | partial | B handwritten-baseline local; A/C Cloud-blocked; no fabricated export |
| P1.4 GitHub evidence + runbook | partial | Real PR/check URLs captured; branch protection still owner UI; Cloud pending |

### Real CI / PR links

- Healthy required: https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38104081711
- Defect PR: https://github.com/rajudandigam/cypress-test-trust-demo/pull/1
- Defect red run: https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38104090068 (`BOOKING_STATUS_MISMATCH`)
- Repair green run: https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38106041405

### Outstanding

1. Owner: require status check `ci-required` on `main` (ruleset API not accepted from CLI)
2. Owner: Cypress Cloud projectId + `CYPRESS_RECORD_KEY` secret + AI allowance
3. Capture genuine `cy.prompt` export into `demo/generated/` after Cloud login
4. Optional: close or keep PR #1 after talk rehearsal

## Deferred

P2 hardening, P3 hosting/slides — not started.
