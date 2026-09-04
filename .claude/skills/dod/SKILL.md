---
name: dod
description: Run the disalytics Definition of Done gate and self-review checklist before opening or updating a PR. Use when work on a branch is finished, before pushing, or when the user asks "is this ready", "check my work", "run the checks", or "open a PR".
---

# Definition of Done

`AGENTS.md` §18 plus the review checklist in `CODE_REQUIREMENTS.md` §14. Run **both halves** — the
commands catch mechanical failures, the checklist catches everything the tooling cannot see.

## 1. The commands

Run every one that exists in the repo. Report actual output. A skipped check is a failed check —
say so explicitly rather than quietly omitting it.

```bash
bun run typecheck
bun run check          # biome; no new suppressions
bun run i18n:check     # no missing, orphaned or unread keys in either locale
bun run tokens:check   # no class or var(--…) the built stylesheet never defined; build first
bun run test
bun run build
bun run size           # budgets in AGENTS.md §16
cargo test -p demo-parser   # only when crates/ changed
```

Do not report success on a partial run. If a command fails, fix the cause — never the assertion,
never by adding a suppression.

## 2. The checklist

Read the actual diff (`git diff main...HEAD`) and answer each of these against it. Do not answer
from memory of what you intended to write.

**Clarity**
- [ ] Would a reviewer need to ask what any line does?
- [ ] Any comment that only restates the code? Any required comment (§4) missing?
- [ ] Any `TODO` left behind instead of an issue opened?
- [ ] Any file over ~300 lines, or nesting deeper than 3?

**Types**
- [ ] Any `any`, `!`, or unexplained `as`?
- [ ] Any impossible state representable by the types?
- [ ] Any class that is not an `Error` subclass?

**Architecture**
- [ ] Any rule re-derived in a component instead of imported from `demo-core`?
- [ ] Any deep import past another slice's barrel? Any new sideways or upward dependency?
- [ ] Any DOM, React, browser API, or I/O added to `packages/demo-core`?
- [ ] Any `wasm-bindgen`, `js-sys`, or `web-sys` in `crates/demo-parser`?
- [ ] Any new package that only one app imports?

**i18n**
- [ ] Any user-visible text produced inside `demo-core` instead of `{ key, params }`?
- [ ] Every user-facing string through i18n, with `en` and `ru` both filled in?
- [ ] Russian plurals covering all four ICU forms wherever a count appears?
- [ ] Any weapon or map name run through `<Text>`?
- [ ] Does the layout still work with the longer Russian string?

**Runtime**
- [ ] Any allocation added to a hot path (§9)? Any `await` in a scrub or render path?
- [ ] Every effect, worker, listener and rAF cleaned up?
- [ ] Any `useEffect` computing derived state?
- [ ] Every user-facing error mapped to translated copy, not a raw exception?
- [ ] Anything subscribed to the frame channel touching React? Any animation heavy enough that
      §16's 60 fps assertion needs re-measuring — a layout-triggering property, a filter, or a
      mark multiplied across the plate?

**Contract**
- [ ] Parser output still deterministic? Golden snapshot change intentional and hand-reviewed?
- [ ] `SCHEMA_VERSION` bumped if parsed output shape changed?
- [ ] Any new runtime dependency? It needs human approval — ask, do not assume.
- [ ] Budgets in `AGENTS.md` §16 still met? If one was touched, are there before/after numbers?
- [ ] Behaviour change reflected in `AGENTS.md` or `docs/`?

## 3. Against the issue

Re-read the issue's acceptance criteria and confirm each one individually. Confirm nothing drifted
into the branch that belongs to the **Out of scope** section — if something did, revert it and open
a follow-up issue.

## 4. Report

State plainly what passed, what failed with its output, and what was not run and why. Do not
summarise a red run as "mostly passing".
