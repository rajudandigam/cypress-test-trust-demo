# Defect and repair patches

These patches are generated against the implemented source for the CI demonstration.

## Intent

- **defect**: Omits the final confirmation update after the simulated provider returns confirmed.
  The reservation remains `pending`. Unchanged critical tests must fail with `BOOKING_STATUS_MISMATCH`.
- **repair**: Restores the finalization update without modifying assertions.

## Apply in a disposable worktree (never reset a dirty main workspace)

```bash
git worktree add ../cttd-defect -b demo/pending-finalization-defect
cd ../cttd-defect
git apply demo/patches/omit-finalization.defect.patch
# verify locally, push only when authorized
```

```bash
git worktree add ../cttd-repair -b demo/pending-finalization-repair demo/pending-finalization-defect
cd ../cttd-repair
git apply demo/patches/omit-finalization.repair.patch
```

Record the base commit SHA in `demo/evidence/manifest.json` when patches are applied.
