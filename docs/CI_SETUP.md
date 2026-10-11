# CI and repository protection setup

Workflow files are **not** proof that merging is blocked. Complete these steps with owner/admin access.

## 1. Repository and remote

Target path: `/Users/dand/Dev/cypress-test-trust-demo`  
Remote: `git@github.com:rajudandigam/cypress-test-trust-demo.git`

```bash
cd /Users/dand/Dev/cypress-test-trust-demo
git push -u origin main
```

Confirm the remote points at **this** project, not `flight-search-demo`.

## 2. First required workflow run

After push, open Actions and wait for workflow `required`.  
Required check name to select in branch protection: **`ci-required`**.

Recorded after first green run:

- Run URL: https://github.com/rajudandigam/cypress-test-trust-demo/actions/runs/38104081711
- Commit SHA: `24786abff76b030883a00a5a8a345253c566ebc8`
- Exact check name: `ci-required`

## 3. Branch ruleset / protection on `main`

1. Settings → Rules → Rulesets (or Branches → Branch protection).
2. Target `main`.
3. Require a pull request before merging.
4. Require status checks to pass: select **`ci-required`**.
5. Require branches to be up to date before merging (recommended).
6. Do **not** allow the demo actor to bypass for the blocked-merge demonstration.
7. Optional: require review from Code Owners (needs a second collaborator).

Settings that need owner/admin: rulesets, required checks, bypass list, CODEOWNERS enforcement.

## 4. CODEOWNERS

File: `.github/CODEOWNERS` (owner `@rajudandigam`).  
A PR author cannot demonstrate independent approval by approving their own PR. If no second reviewer exists, leave approval honestly pending.

## 5. Cypress Cloud (adaptive only)

1. Create/select a Cypress Cloud project.
2. Copy non-secret `projectId` into repo variable `CYPRESS_PROJECT_ID` or `cypress.*.config.ts` `projectId`.
3. Log in locally for open-mode native prompt runs (`npx cypress open`).
4. Confirm AI/`cy.prompt` usage allowance before rehearsal.

## 6. GitHub Actions secret

Settings → Secrets and variables → Actions → New repository secret:

- Name: `CYPRESS_RECORD_KEY`
- Value: paste the Cloud record key **in the GitHub UI only** (never commit; never paste into chat).

## 7. Adaptive workflow

Run `adaptive` on a trusted same-repo branch or via `workflow_dispatch`.  
Fork PRs do not receive secrets. A skipped/missing-secret run is **not** successful verification.

## 8. Defective PR evidence

```bash
git worktree add ../cttd-defect -b demo/pending-finalization-defect
cd ../cttd-defect
npx tsx scripts/apply-demo-defect.ts defect
# commit, push, open PR — critical check must go red
# then repair:
npx tsx scripts/apply-demo-defect.ts repair
# commit, push — ci-required green; capture merge-block screenshots/URLs
```

## 9. Status log

| Item | Status |
|------|--------|
| Workflow files | implemented |
| First `ci-required` run | pending remote push |
| Branch protection | pending admin |
| Cypress Cloud | pending owner setup |
| Defective PR URLs | pending authorization |
