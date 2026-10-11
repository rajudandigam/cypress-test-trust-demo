# Progress

## Reference status (before)

- Path: `/Users/dand/Dev/flight-search-demo`
- HEAD: `5724318ae5544fdec299685cdf6aa5d51b5f1af9`
- Dirty: untracked `cypress_conf.code-workspace` only

## P0

| Milestone | Status | Evidence |
|-----------|--------|----------|
| P0.1 Skeleton | verified locally | Node 24.12.0, Cypress 16.1.1, Postgres 16.15 Homebrew, npm lockfile |
| P0.2 Healthy journey | verified locally | Manual API + UI booking Confirmed; `/api/health` ready |
| P0.3 Critical tests | verified locally | `npm run test:unit` 15 pass; `test:api` 6 pass; `test:policy` ok; `test:critical` BOOK-001/002 pass |
| P0.4 Required CI files | implemented but not run | `.github/workflows/required.yml` with `ci-required` |

### Commands run (selected)

```
npm install
npm run db:migrate && npm run db:seed
npm run test:unit   # pass
npm run test:api    # pass
npm run test:policy # pass
npm run build       # pass
npm run test:critical # pass (identities BOOK-001, BOOK-002)
```

## P1

| Milestone | Status | Notes |
|-----------|--------|-------|
| P1.1 Native cy.prompt | blocked by external setup | `npm run test:adaptive` exited 2 with `CLOUD_PREREQUISITE_MISSING` — do not mock |
| P1.2 Scenarios + defect | verified locally (scenario API) / remote pending | `pending-finalization` API test pass; `apply-demo-defect.ts` round-trip ok |
| P1.3 Hybrid/export | partial | A/C specs present (Cloud-blocked); B handwritten-baseline **verified locally** on healthy |
| P1.4 GitHub evidence + runbook | partial | Runbook written; remote PR/check URLs pending push + admin |

### Local acceptance re-check (after booking-service restore)

- `npm run lint` pass
- `npm run test:unit` / `test:api` / `test:policy` / `test:critical` pass
- Comparison Variant B pass on healthy
- Adaptive correctly reports Cloud blocker (exit 2)

## Known limitations

- Docker not available on the bootstrap machine; `db:up` falls back to Homebrew PostgreSQL 16.
- Electron browser used for critical local runs (deprecated warning); CI should use Chrome via Actions image.
- No fabricated healing/export/CI URLs.

## Next actions

1. `git push -u origin main` when authorized
2. Configure `ci-required` as required check
3. Add `CYPRESS_RECORD_KEY` + Cloud project; run adaptive
4. Open defective PR from worktree; capture URLs
