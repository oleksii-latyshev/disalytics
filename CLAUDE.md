# CLAUDE.md

Entry point for AI agents, loaded every session. It is a map, not the contract — read the matching
document before doing that kind of work.

| Document | Read it before |
|---|---|
| `AGENTS.md` | any non-trivial task — the operating contract, budgets, architecture |
| `CODE_REQUIREMENTS.md` | writing code — layering, naming, comments, React, i18n patterns |
| `CONTRIBUTING.md` | creating an issue, branch or PR; labels and milestones |
| `packages/ui/src/styles/tokens.css` | any visual work — it is the design system |
| `docs/PARSER.md` | parser, WASM or schema work |
| `vendor/README.md` | touching anything under `vendor/` |

**History is not kept in docs.** Why a thing is the way it is lives in its pull request:
`git log --oneline -- <path>` then `gh pr view <N>`. Don't add per-PR narratives to these files.

---

## What this is

**disalytics** — a fully client-side PWA for reviewing Counter-Strike 2 replays (`.dem`), in English
and Russian. It compresses a 40-minute match into a ~10-minute review. Live at
https://disalytics.disa-67b.workers.dev.

- **Review, not frame-perfect replay** — favour smoothness, label approximations in the UI.
- **Private by construction** — the demo never leaves the browser.
- **Game-agnostic name** — nothing outside `crates/demo-parser` assumes "CS2".

## Where things stand

Phases 0–4 (parser, pipeline, radar, playback) and the September 2026 redesign are done. **Phase 5 —
analytics — is active.** What ships today:

- **Way in** — upload card over a pixel background playing a recorded round; library of saved demos
  as cards; two sample matches (public IEM Atlanta 2026 parses); bottom dock navigation.
- **Review screen (stage)** — radar plate in the middle, T and CT team cards, event feed, corner
  cluster (fullscreen, settings, help), bottom block with round strip, round axis with event glyphs
  and filters, transport and speed.
- **Match views** (top-centre switch, `V`) — stage, scoreboard, duels, heat map, utility; metrics is
  "Soon".
- **Settings sheet** (playback, plate, interface, colour, developer) and **help sheet**
  (generated shortcut table, legend drawn by the plate's own code).
- **PWA** — offline shell, update prompt, OS file handling.

**What is next is in GitHub**: milestones *Polish*, *Match views*, *Toolbox*, *Coaching*, *Lineups*,
*Player profiles*; issues carry `priority:p0–p3` and `size:xs–xl`. There is no roadmap file.

---

## Architecture in one screen

```
.dem ─► packages/demo-parser (Web Worker) ─► crates/demo-parser-wasm ─► crates/demo-parser ─► vendor/
            │ progress · header · done{TickTrack, MatchEvents} (buffers transferred) · error{code}
            ▼
apps/web/src/core/parsing ──► packages/demo-store (OPFS → IndexedDB cache, catalog)
            ▼
features/review (MatchReview grid) ─► features/radar (canvas layers) · features/timeline · controls
            ▲
core/playback transport ── frames channel (canvas only) / transport channel (React)
```

| Package / folder | Owns |
|---|---|
| `packages/demo-core` | schema + `SCHEMA_VERSION` (8), clock, game rules and derivations (scores, sides, grenade state, audibility, duels, heat field, scoreboard). Pure TS |
| `packages/demo-parser` | worker protocol and client; `src/wasm-glue.d.ts` is hand-written |
| `packages/demo-store` | cache, fingerprint key, eviction, container codec (`@disa/demo-store/codec`) |
| `packages/map-data` | overview constants, world→radar transform, themed radar images |
| `packages/i18n` | locale JSON per namespace, typed key union, `<Text>`, `useT` |
| `packages/ui` | copied shadcn/animate-ui components on Base UI, `tokens.css`, `MotionProvider` |
| `apps/web/src/core` | playback, renderer, shortcuts, settings, parsing, events, glyphs, motion, pwa, samples |
| `apps/web/src/features` | library (way in), review (stage + views), radar, timeline, controls |
| `crates/demo-parser` | Rust core: containers, two passes, schema extraction. No wasm-bindgen |
| `vendor/` | upstream parser, pinned and patched |
| `tools/scripts` | every `bun run` check and generator |

Packages are `@disa/<folder>`. `apps/web/vite.config.ts` aliases `demo-parser-wasm` to
`crates/demo-parser-wasm/pkg/`, so **`bun run build` needs a built `pkg/`**.

---

## Hard rules — violating one is a bug

Full text in `AGENTS.md` §2.

1. **No server ever touches a `.dem`.**
2. **Parsing runs in a Web Worker.**
3. **Per-tick data is columnar typed arrays; events are sorted arrays of objects.**
4. **`clock.frame` never lives in React state or a store**; nothing on the frame channel touches React.
5. **No `localStorage`/`sessionStorage` for parsed data** — OPFS, then IndexedDB. Preferences are fine.
6. **No `any`, no `!`, no silencing `as`**; `@ts-expect-error` only with a comment and an issue.
7. **No hardcoded user-facing strings** — `en` and `ru` together; core emits `{ key, params }`.
8. **Parsing is deterministic.**
9. **Playback and scrub hold 60 fps** — the budget is the rule; canvas changes follow `clock.frame`.
10. **New runtime dependencies need human approval.**
11. **`packages/demo-core` is platform-agnostic** — no DOM, React, I/O, `@/`.
12. **`crates/demo-parser` has no `wasm-bindgen`/`js-sys`/`web-sys`.**
13. **One-way dependencies** — `features → core → shared`, `apps → packages`; barrels, not deep paths.

---

## Load-bearing decisions that are easy to undo by accident

- **Sides follow the round, not the roster.** Read `Round.economy[].team` (`sidesBySlotAtRound`);
  `PlayerInfo.team` is the end-of-match side and wrong for half the match. Teams are named by the
  side they opened on (`openingSideBySlot`, `matchScore`).
- **Nothing allocates or walks event arrays inside a draw.** Derive once per demo or per round;
  per-slot helpers write into the caller's typed array; `Path2D`s and text widths are cached.
- **Everything on the plate is a function of match time**, so scrubbing backwards replays it.
- **`memo` on `RoundOutcomes` and `EventGlyphs` is measured, not reflex** — 10 Hz re-renders of
  hundreds of buttons cost frames.
- **The scrubber is uncontrolled** and scoped to the current round (`min`/`max` are round frames).
- **Selection is React state set from a team-card row**, never a canvas hit test.
- **The plate is `min(100cqi,100cqb)` of a grid cell no card is in.** Anything that adds a grid row
  shrinks the map; the view switch and brow are out of flow for that reason. Quote plate sizes with
  the viewport height: stage 716 at 1440×900, 473 at 1024×800.
- **A `motion` component never receives Base UI's composite ref** (toggle groups use plain buttons);
  `transition-[transform]` does not animate Tailwind v4's `translate-*`/`scale-*` (they set the
  individual properties) — use the utility.
- **Settings are one store, one key per setting, read where obeyed** (`core/settings`). Palette and
  motion override are document attributes written outside React.
- **`core/shortcuts` suspends while a sheet is open**; `useShortcuts` ignores `defaultPrevented` keys.
- **Weapon vocabularies differ** — display names (`AK-47`) vs internal (`ak47`); bridge with
  `ENTRY_BY_INTERNAL_NAME`, never a new table.
- **A `SCHEMA_VERSION` bump** needs `samples:generate` (owner's demo folder) and `reel:generate` in the
  same PR, or `samples:check`/`reel:check` fail CI.
- Code comments citing `DESIGN.md` §N or `ROADMAP.md` point at deleted documents; the behaviour they
  describe is still current.

---

## Conventions that get broken most often

- **`tick` ≠ `frame`.** `tick` is a demo tick (64/s); `frame` is a `TickTrack` sample index (16 Hz). A
  variable named `tick` holding a frame is a bug even when the code works.
- **Game vocabulary is never translated** — weapons, maps, callouts, `eco`, `clutch` are constants in
  `demo-core`, not i18n keys. UI chrome, help and errors are translated.
- **Russian plurals need four ICU forms** (`one`/`few`/`many`/`other`).
- **Design layouts against the Russian string** (15–30% longer). No fixed-width labels.
- **Numbers use tabular figures** (IBM Plex Mono, `tabular-nums`).
- **`border-t` is not a top border** — `--color-t` claims Tailwind's `t` namespace. Use
  `[border-block-start:1px_solid_var(--color-line)]`. `border-b/l/r` are fine.
- **The chrome has no hue.** Colour on screen means something the demo said.
- **Aim for zero comments**; only constraints the code cannot express. **No `TODO`** — open an issue.
- **Package names are `@disa/<folder>`.**
- **Measure, don't assume**: frame budgets in headed Chrome over CDP (the in-app browser pane reports
  the tab hidden and cannot measure frames or transitions); bundle size on a forced clean build.

---

## Workflow

`issue → branch (gh issue develop <N> --checkout --base main) → commits → PR (Closes #N) → CI green →
squash merge`

- **No issue, no branch. One PR per issue. Never push to `main`.** Squash only; `--auto` is refused —
  wait for `mergeStateStatus` `CLEAN`.
- Titles are conventional commits: `type(scope): subject`, scope = `area:` label without the prefix.
- Every issue: one `type:`, one `area:`, one `phase:`, a `priority:`, a `size:` and its milestone.
  `size:xl` is an epic — split it into issues before opening a branch.
- Docs and small fixes ride inside the feature PR that motivates them; features stay one per PR.
- Skills: `task` (the loop), `i18n-key` (any user-facing string), `dod` (before a PR), `handoff`.
- Lefthook runs Biome on staged files + whole-project `typecheck` pre-commit, `test` pre-push, and
  `cargo fmt --check` + clippy when Rust is staged. `LEFTHOOK=0` skips — say so in the PR.

---

## Commands

```bash
bun install               # install; also installs lefthook hooks
bun run dev               # vite dev server for apps/web (:5173)
bun run build             # typecheck + vite build → apps/web/dist (needs crates/demo-parser-wasm/pkg)
bun run preview           # build, then serve dist through wrangler dev (:8787)
bun run typecheck         # workspaces via turbo, then tools/scripts
bun run check             # biome lint + format (check:fix to apply)
bun run test              # vitest, node environment

bun run i18n:check        # en/ru parity, no unread keys; regenerates the typed key union
bun run errors:check      # ErrorCode parity: demo-core ↔ crates/demo-parser
bun run bitfields:check   # FLAG_* / GRENADE_* parity between the same two
bun run contrast:check    # every contrast figure stated in tokens.css still measures true
bun run tokens:check      # every class and var(--…) resolves in built CSS (build first)
bun run samples:check     # committed sample containers match SCHEMA_VERSION
bun run reel:check        # the way-in reel regenerates byte-identically
bun run size              # bundle + wasm vs budgets (build first; use --force build); --wasm = pkg only

bun run wasm:build        # wasm-pack build → crates/demo-parser-wasm/pkg
bun run wasm:smoke        # call into the built binary; DISALYTICS_FIXTURE_DEMO also checks output shape
bun run mapdata:generate  # map constants + themed radar images, byte-stable
bun run icons:generate    # weapon/utility/equipment outlines, byte-stable
bun run samples:generate  # sample containers from local demos (DISALYTICS_SAMPLE_DIR)
bun run reel:generate     # the way-in reel from the dust2 sample
bun run smoke <url>       # assert the deploy contract (AGENTS.md §13) against a URL
bun run repo:labels       # sync GitHub labels (idempotent)
bun run repo:milestones   # create missing milestones (idempotent)

cargo test -p demo-parser # parser core; DISALYTICS_FIXTURE_DEMO=<path> runs the fixture test
```

`cargo` may not be on `PATH` in this environment; `e2e` does not exist yet.

---

## Stop and ask instead of guessing

If a task would add a runtime dependency, put async I/O in a scrub or render path, change
`SCHEMA_VERSION`, require anything server-side, exceed an `AGENTS.md` §16 budget, move `clock.frame`
into a reactive store, add `wasm-bindgen` to `crates/demo-parser`, hardcode a user-facing string, or
translate game vocabulary — ask. These are the decisions the documentation exists to protect.
