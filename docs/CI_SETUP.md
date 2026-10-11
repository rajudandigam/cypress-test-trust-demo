# CI and repository protection setup

Workflow files are **not** proof that merging is blocked.

## Recorded evidence (historical)

- Green `ci-required` on main (post-merge): see Actions for latest `required` workflow on `main`
- Historical defect (pre-protection): https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38104090068 (`BOOKING_STATUS_MISMATCH`)
- Historical repair: https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38106041405
- Merged PR #1 (does **not** prove protection was active): https://github.com/rajudandigam/cypress-test-trust-demo/pull/1

## Owner: activate merge enforcement

1. Settings → Rules → Rulesets → New ruleset targeting `main`
2. Require a pull request before merging
3. Require status checks: **`ci-required`** (from workflow job name)
4. Require branches to be up to date (recommended)
5. Do **not** allow the demo actor to bypass
6. Optional: require Code Owner review only if a second collaborator exists

## Owner: Cypress Cloud (adaptive)

1. Create/select Cloud project
2. Set repository **variable** `CYPRESS_PROJECT_ID` to the non-secret project id (`adaptive.yml` maps `vars.CYPRESS_PROJECT_ID`)
3. Set repository **secret** `CYPRESS_RECORD_KEY` in the GitHub UI (never commit; never paste into chat)
4. Local: `CYPRESS_PROJECT_ID=... npm run cy:open:adaptive` after Cloud login

## New protected defect PR (after ruleset is active)

```bash
git fetch origin
git worktree add ../cttd-defect2 -b demo/pending-finalization-defect-2 origin/main
cd ../cttd-defect2
npx tsx scripts/apply-demo-defect.ts defect
git add src/server/services/booking-service.ts
git commit -m "Demonstrate pending-finalization application defect."
git push -u origin HEAD
gh pr create --title "demo: pending-finalization (expect blocked merge)" --body "Unchanged critical tests must fail BOOKING_STATUS_MISMATCH. Do not merge."
# Capture: red ci-required + blocked merge UI at that SHA
npx tsx scripts/apply-demo-defect.ts repair
git commit -am "Repair pending-finalization without changing assertions."
git push
# Capture green run; merge only the repair if desired
```
