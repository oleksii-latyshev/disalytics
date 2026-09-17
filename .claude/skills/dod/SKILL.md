---
name: dod
description: Review a finished disalytics branch before a pull request is marked ready or merged.
---

# Readiness review

Do not repeat the full local command suite: required `ci` and `wasm` checks own deterministic
verification.

1. Read `git diff main...HEAD` and the issue. Confirm every acceptance criterion and reject drift
   into Out of scope.
2. Review only risks present in the diff: dependency direction and public barrels; i18n and Russian
   layout; worker/effect cleanup; parser determinism or schema changes; hot-path allocations; new
   runtime dependencies; documentation of changed behaviour.
3. Run manual evidence that CI cannot provide only when touched: visual/accessibility inspection,
   real-demo fixtures, or `AGENTS.md` §16 performance measurements.
4. Use `gh pr checks` and `mergeStateStatus`; inspect detailed logs only for failed jobs. A skipped,
   pending or failed required check means the branch is not ready.

Report unmet criteria, manual evidence and CI status plainly.
