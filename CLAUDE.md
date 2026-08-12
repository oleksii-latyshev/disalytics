# CLAUDE.md

Entry point for AI agents. This file is loaded automatically every session; the full contract is
not. Read the companion documents before doing the matching work — do not work from this summary
alone.

| Document | Read it before |
|---|---|
| `AGENTS.md` | any non-trivial task — it is the operating contract |
| `CODE_REQUIREMENTS.md` | writing any code |
| `CONTRIBUTING.md` | creating an issue, branch, or PR |
| `docs/DESIGN.md` | any visual or component work |
| `docs/PARSER.md` | parser or WASM work (written during Phase 0) |

---

## What this is

**disalytics** — a fully client-side web app for analyzing Counter-Strike 2 match replays (`.dem`),
installable as a PWA, in English and Russian. It compresses a 40-minute match into a ~10-minute
review via filtering, an interactive timeline, and a 2D radar.

The name is game-agnostic on purpose. Nothing outside `crates/demo-parser` may encode "CS2" as an
assumption.

**Product principle:** a tool for *review*, not frame-perfect replay. Where accuracy and interaction
smoothness conflict, favour smoothness and label the approximation in the UI.

---

## Repository state

Phase 0 is complete — the parser is validated and the findings are in `docs/PARSER.md`. The
`create-turbo` starter has been replaced: `apps/web` is a Vite SPA, Biome has replaced
ESLint + Prettier, and every package is `@disa/*`.

Phase 1 is complete. Phase 2 is under way: `crates/demo-parser` and `crates/demo-parser-wasm` were
scaffolded in #44 and actually parse since #46. Upstream `demoparser` is **copied into `vendor/`**,
not fetched — patched for the `wasm32` `Instant::now()` trap and stripped of two build scripts that
reached the network. **Read `vendor/README.md` before touching anything under `vendor/`**; every
deviation from the pinned revision is listed there and nowhere else.

Since #49 the crate produces the whole `AGENTS.md` §10 schema in the three passes upstream imposes,
verified against a real demo whose golden snapshot lives in `crates/demo-parser/tests/snapshots/`.
That test is skipped unless `DISALYTICS_FIXTURE_DEMO` names a `.dem`. Read `docs/PARSER.md` §13
before touching the extraction — it records what the demo does *not* carry (a tick rate, a bombsite
name) and which upstream fields are dead.

Since #48 the crate also opens the containers demos arrive in — `.dem.zst` and `.dem.bz2`,
identified by magic bytes and expanded before upstream sees a byte, with `.dem.gz` named as
`UNSUPPORTED_CONTAINER` rather than parsed. The decoders are `ruzstd` and `bzip2` **0.6**, whose
default backend is a Rust rewrite rather than the C bindings the crate is named for; that is a
deliberate departure from the `bzip2-rs` `AGENTS.md` §7.1 used to name, and `docs/PARSER.md` §15 is
the only place the reasoning and the numbers live.

`packages/demo-core` exists since #47 and holds the contract both sides write against: the `AGENTS.md`
§10 event schema, `TickTrack`, `SCHEMA_VERSION`, the game vocabulary and the `ErrorCode` union.
`bun run errors:check` fails when that union drifts from `crates/demo-parser/src/error.rs`, and it
runs in **both** `ci.yml` and `wasm.yml` because neither workflow sees both files on its own.

`packages/demo-parser` exists since #50: the §7.3 protocol, the worker, and the client that
terminates it. The worker resolves the generated glue as `demo-parser-wasm`; `pkg/` is gitignored,
so the types come from a hand-written `src/wasm-glue.d.ts` and `bun run wasm:smoke` is what proves
it has not drifted. Read `docs/PARSER.md` §14 before touching the boundary.

`apps/web` consumes it since #52 — `core/parsing` owns the lifecycle, `features/library` owns the
screens, and `apps/web/vite.config.ts` aliases `demo-parser-wasm` to
`crates/demo-parser-wasm/pkg/demo_parser_wasm.js`. **`bun run build` fails without a built `pkg/`**,
so `wasm.yml` now writes that directory to a cache keyed on the parser's inputs and `ci.yml` and
`deploy.yml` restore it rather than installing Rust. That is how §15's "never rebuild the parser on
a frontend-only commit" survives the SPA depending on the binary. `deploy.yml` also triggers on
`wasm`, or a parser-only commit would never reach production. The `wasm content-type` assertion in
the deploy smoke test is green: 12 passed, 0 failed, 0 skipped.

`packages/map-data` exists since #70 and opens Phase 3: Valve's overview constants for the seven
active duty maps, the §9 transform, and the radar images themselves — `vanilla` as extracted, plus
a `blue` theme this repository generates from it. `bun run mapdata:generate` rebuilds both from the
committed assets and must be byte-stable across runs. Read `AGENTS.md` §9 before touching the
assets or adding a theme.

The renderer arrived in #79: `apps/web/src/core/renderer` is canvas plumbing that knows nothing
about CS2, `apps/web/src/features/radar` is what knows about maps and sides. `AGENTS.md` §9 holds
the level rules and what the debug overlay is for.

Phase 4 opened with #82 — the clock. `packages/demo-core` owns it, `apps/web/src/core/playback` binds
it to one rAF loop, and `features/controls` is play/pause and speed. Two things there are load-bearing
and easy to undo: **the transport publishes frames and transport state on separate channels**, and
**nothing on the frame channel may touch React** — that is how hard rule 4 survives contact with a
60 Hz loop. Read `AGENTS.md` §8 before changing any of it. Zustand is still not installed; the
transport is the store. Since #98 the loop also refuses to spend more than `MAX_FRAME_MS` of real
time on one frame and forgets its last timestamp on `visibilitychange` — a hidden tab suspends rAF,
and 46 s away used to arrive as 46 s of match in a single step.

#83 added the spine: `features/timeline` is the scrubber and the round picker, and
`core/shortcuts` binds `docs/DESIGN.md` §9's keys. The scrubber is an **uncontrolled** range input —
React never owns its value — and the playhead moves with `transform` only. What #83 left was a bare
strip: hairlines and a playhead, nothing about the match itself.

#87 put those panels into the `docs/DESIGN.md` §4 layout. An opened demo is no longer a block in the
reading column: `App` hands the whole viewport to `features/review`, which is a three-row grid —
match strip, radar beside the inspector, spine along the bottom. `features/inspector` exists but is
a column with an empty state; Phase 5 fills it. Two things there are load-bearing: **the radar sizes
itself from container units** (`min(100cqi,100cqb)` inside a `container-type: size` cell) because it
must never be cropped on either axis, and **the inspector column is `minmax(min-content, min(22rem,
33%))`** — bounded so the radar stays dominant, floored on its own content so a Russian label widens
it instead of being clipped.

#91 drew the match onto that strip: a band per round tinted by its winner, an event-density trace,
the round hairlines moved off the DOM onto the same canvas, and a 2px `KillMarkers` tick per kill
over it. Economy is still missing — that is #90. Four things are load-bearing. **The spine canvas is
demand-driven**: `useCanvasLayers` repaints it on a resize or a new demo, and `repaint` is
deliberately *not* handed to `useFrameSink` the way `RadarView` hands it — wiring it up "for
consistency with the radar" puts a seismogram in the frame path. **`KillMarkers` is `memo`'d**, and
that is not reflex memoisation: `MatchSpine` re-renders off the 10 Hz readout, and reconciling 225
buttons ten times a second cost 5 fps and took the worst scrub frame from 13 ms to 25 ms on a 264 MB
demo. **The density series is derived once per demo** — nothing walks an event array inside a draw,
which is also why `layers` and everything feeding it are `useMemo`'d on `[demo]`. And
**`SPINE_AXIS_FRACTION`** in `features/timeline/helpers/spine.ts` is one number with two readers, the
canvas and the DOM markers above it. Read `AGENTS.md` §8 before changing any of it.

#92 gave the canvas words: `RoundOutcomes` is an `sr-only` list of every round — number, winning
side, and `Round.reason` through an exhaustive switch — because `role="img"` announces that a
picture exists and nothing about what it shows. The density trace is deliberately left unvoiced;
§8 says why.

#90 filled the bottom band with the buy: one block per round leaving the band's centre line upward
when the CT side was better equipped and downward when the T side was, voiced by an `EconomyGaps`
list beside `RoundOutcomes`. It needed a schema change — **`PlayerEconomy` now carries the side the
slot held that round, and `SCHEMA_VERSION` is 3**, because `PlayerInfo.team` is read at the end of
the match and would have put the wrong side ahead in half the rounds. Every cached demo is a miss
once. `MARKER_BAND_PX` in `features/timeline/helpers/spine.ts` is the second number with two
readers, alongside `SPINE_AXIS_FRACTION`.

#108 opened Phase 5 by making the old hard rule 9 enforceable rather than trusted, with
`bindPlayingFlag` writing `data-playing` on the document element and one rule in
`packages/ui/src/styles/motion.css` taking every transition beneath it to zero. **#132 removed both**
— rule 9 stopped banning DOM motion during playback, so a global kill switch enforces a rule the
product no longer has. `motion` is installed and enters the tree through exactly one
`MotionProvider` in `@disa/ui`, a `strict` `LazyMotion`, so `motion.*` throws and `m` is the only way
to animate. Animate UI's registry is configured in `packages/ui/components.json`, and its aliases are
**package.json `imports`** (`#components`, `#lib`, `#hooks`) because a package-local `@/` is
impossible here and that is what makes the shadcn CLI resolve inside `packages/ui`. Read `AGENTS.md`
§8 before changing any of it.

#111 put people on the plate: a name chip per live player, a facing needle from `yaw` that
`FLAG_SCOPED` lengthens, a vision wedge for the one selected player, and a dead player drawn at
`--ink-faint` instead of vanishing. Four things are load-bearing. **Nothing on the way to the canvas
allocates** — the layer owns its scratch, chip widths are measured once per demo, and the vision
gradient is built once around the origin and painted under a `translate`. **`useFontReady` gates the
labels on purpose**: a canvas never requests a webfont itself, and a width measured against the
fallback face would be wrong for the whole match. **`labelPlacer` moves the label, never the token**,
and resets per frame so placement is a function of the frame rather than of history. And **the
selected player is React state in `features/review`, set from a rail seat** — a canvas hit test would
be the one interaction on this screen a keyboard cannot reach. Read `AGENTS.md` §9 before changing
any of it.

#112 added what is happening to those people: a `--damage` flash on a token that was just hit, a
facing needle dropped while its player is blinded, a progress arc for a plant or a defuse, and a 1px
audibility ring from `speed`. **All four are functions of match time and none of wall time** — that
is `docs/DESIGN.md` §8's test for what may move while playback runs, and it is why scrubbing
backwards through a hit shows the flash again. **The rules live in `packages/demo-core`**:
`helpers/audibility.ts` is the model, `helpers/player-state.ts` is `damageFlashBySlot`,
`blindedBySlot` and `bombProgressAt`, and both are unit-tested there rather than eyeballed on a
plate. The two per-slot lookups write into the caller's typed array because they run inside a draw,
and every event lookup is `lastIndexAtOrBefore` plus a walk backwards bounded by the window rather
than by the match. The audibility numbers are a named approximation of an unpublished falloff, and
**the ring itself starts off** behind a top-bar toggle remembered in `localStorage` — it is the
largest mark on the plate and it competed with the players. Read `AGENTS.md` §9 before changing any
of it.

**#130 rewrote `docs/DESIGN.md` from the ground up, and most of the UI described above is now
scheduled to be replaced.** It is the third revision and the first that is not an amendment: three
revisions had drawn the same verdict from the owner — dated, unsurprising — which is evidence the
rules were wrong rather than their execution. Four decisions came with it, each an `AGENTS.md` §21
"stop and ask" now closed: the player rails get **live armour, weapon, grenades and money**
(`SCHEMA_VERSION` 3 → 4); **`ogl` is an approved runtime dependency** for two WebGL backgrounds on
the landing and parse screens only; **hard rule 9 is a frame budget, not a prohibition**, so
`bindPlayingFlag` and the `data-playing` reset are removed; and **the bottom of the review screen
carries the round**, with the whole-match spine re-scaled to a 14px ribbon rather than discarded.
The review screen loses its top bar, its rails and its inspector column: a plate in the middle,
four floating glass cards around it, sized so **no card ever overlaps the plate** — which is what
makes `backdrop-filter` affordable and is a layout rule rather than a convention. `docs/DESIGN.md`
§15 lists the nine issues that owe it code, in dependency order.

**#132 landed the first of them — the token layer.** `packages/ui/src/styles/tokens.css` is now
§2's palette, §3's type scale and §4's radius, spacing and two control heights (32/40, up from
28/36). `--kill` is deleted: it sat ΔE2000 2.37 from `--damage`, and a kill is told from damage by
shape rather than hue. The accent moved from blue to violet (`#B07CFF`) and lost its fence, which is
what lets the main screen have a voice at all. Optical tracking rides on the size token, so
`text-44` cannot be written without it. Two blur filters exist under `--backdrop-*` rather than
`--blur-*`, because that namespace would build `filter: blur(blur(24px) …)` out of them. Everything
else on this list still follows the old document — **read §15 before assuming a component is
wrong**, and expect every screen to look half-migrated until the layout issue lands.

**#136 landed §15's third step — `SCHEMA_VERSION` is 4.** `TickTrack` gained `armour`, `weapon`,
`grenades` and `money`, helmet became a seventh `flags` bit, and `MatchHeader` gained a **per-match
weapon table** the `weapon` column indexes into. That table is the load-bearing decision: it is
built from what one match carried, so it needs no global weapon vocabulary and an unenumerated
weapon cannot fail a parse — which is why this did **not** wait for #53, now blocked on evidence a
single demo cannot supply. Three traps are recorded in `docs/PARSER.md` §17 and cost real time to
find: the active weapon is **`weapon_name`** and never `active_weapon_name`, which resolves to
nothing and says nothing; `inventory_as_bitmask` is broken for every knife because upstream shifts
by a definition index that reaches 526; and `item_equip.item` cannot tell an M4A4 from an M4A1-S.
Knives collapse to one `Knife` entry, argued from data in #53. `MatchHeader.weapons` is upstream's
display-name vocabulary and so **a different vocabulary from `Kill.weapon`** — #53 is what unifies
them. The table also contains `C4 Explosive`; §6.4's claim that the data does not exist is wrong and
#137 restates it as a rendering rule.

**#140 landed §15's fourth step — the catalog names what it holds.** `CatalogEntry` gained a `meta`
block (file name, map, score, round count, stored-at) and the way in lists it: five rows on the card,
the rest behind a disclosure, each opening from the cache with no file and each removable on the
spot. Four things are load-bearing. **The metadata is written at store time only** — the eviction
contract in `catalog.ts` says a read never writes recency, so `withUse` moves it and carries the
existing `meta` across rather than replacing the entry — while a read that finds *no file* now drops
that entry, because the alternative is a row that can never open. **An entry without `meta` still
parses**: `parseCatalog` normalises rather than filters, so a catalog written before this change
loses names, never entries. **The score is by team** — `matchScore` in `packages/demo-core`, because
`Round.winner` is a side and sides swap; `sideScoreAtFrame`, which the review top bar still reads,
has the bug this avoids and #141 owns it. And **`ParseState.failed` carries an `OpenFailure` rather
than an `ErrorCode`**: a saved demo that has gone is not a parser error and has no code in the
vocabulary `bun run errors:check` guards. `SCHEMA_VERSION` did not move — `ParsedDemo` is untouched.

`packages/demo-store` exists since #51 and closes Phase 2's storage half: a demo parsed once is read
back in **0.02 s** instead of 18.6 s, from OPFS or from IndexedDB when OPFS is missing, chosen by
feature detection. Two things there are deliberate and easy to "fix" into bugs — **the cache key
digests only the ends of the file, not all of it**, and **a missing tier or an unreadable container
is a miss rather than an error**. Both are argued in `AGENTS.md` §6.4, which is also where the
eviction policy and the `storage.persist()` answer live. Every package `AGENTS.md` §4 names now
exists.

The app is live at **https://disalytics.disa-67b.workers.dev** — an assets-only Cloudflare Worker,
`wrangler.jsonc` at the root, `deploy.yml` running downstream of a green `ci`. Every deploy is
checked by `bun run smoke` against the contract in `AGENTS.md` §13 and recorded as a GitHub
deployment. Pull requests get no preview deployment: previews are off since #33, and `AGENTS.md`
§15 has the one-command way to turn them back on.

**`AGENTS.md` outranks anything you observe in the file tree.** If existing code contradicts the
docs, the code is the thing that is wrong.

---

## Hard rules — violating one is a bug, not a trade-off

Full text in `AGENTS.md` §2. Condensed:

1. **No server ever touches a `.dem` file.** No uploads, no demo bytes in any network request.
2. **Parsing runs in a Web Worker.** The main thread never opens, decompresses, or parses a demo.
3. **Per-tick data lives in typed arrays (columnar/SoA), never arrays of objects.** Events are the
   opposite — plain sorted arrays of objects, binary-searched by tick.
4. **`clock.frame` never lives in React state, Zustand, or signals.** Plain mutable object + rAF.
5. **No `localStorage`/`sessionStorage` for parsed data.** OPFS first, IndexedDB fallback.
   UI preferences (locale, theme) are fine there.
6. **No `any`.** No `@ts-expect-error` without a comment and a linked issue. No `!`, no silencing
   `as`.
7. **No hardcoded user-facing strings.** Everything through i18n, `en` *and* `ru` together.
   `demo-core` and the parser emit `{ key, params }`, never display text.
8. **Parsing is deterministic.** Same bytes + same `SCHEMA_VERSION` → byte-identical output.
9. **Nothing on the frame channel animates, and nothing animates a property that triggers layout.**
   `transform`/`opacity` only, always. Everything else may animate during playback; the 60 fps
   assertion in `AGENTS.md` §16 is the enforcement. Rewritten by #130 — the old blanket ban on DOM
   motion during playback is gone, and so is the `data-playing` kill switch that implemented it.
10. **New runtime dependencies require human approval.** Bundle size is a product constraint.
11. **`packages/demo-core` stays platform-agnostic** — no DOM, no React, no I/O, no `@/` alias.
12. **`crates/demo-parser` contains no `wasm-bindgen`**, `js-sys`, or `web-sys`. That is what keeps
    a native Tauri build possible.
13. **Dependency direction is one-way** — `features → core → shared`, `apps → packages`. Never
    sideways between features, never upward. Import barrels, never deep paths.

---

## Conventions that get broken most often

- **`tick` and `frame` are different things.** `tick` is a demo tick at the demo's tick rate;
  `frame` is a sample index in `TickTrack` at `sampleHz`. A variable named `tick` holding a frame
  index is a bug even when the code works.
- **Game vocabulary is never translated.** Weapon names, map names, callouts, and domain shorthand
  (`AK-47`, `Mirage`, `Mid`, `eco`, `clutch`) are canonical constants in `demo-core`, not i18n keys.
  UI chrome, help text, and errors *are* translated.
- **Russian plurals need four ICU forms** (`one`/`few`/`many`/`other`). Two forms is a broken `ru`.
- **Layouts are designed against the Russian string**, which runs 15–30% longer. No fixed-width
  labels.
- **All numbers use tabular figures**, IBM Plex Mono, `font-variant-numeric: tabular-nums`.
- **`border-t` does not draw a top border.** `--color-t` claims Tailwind's `t` utility namespace, so
  `border-t` reads as the Terrorist gold and `border-t-*` is a colour utility with no width. A top
  hairline is `[border-block-start:1px_solid_var(--color-line)]`. `border-b`, `border-l` and
  `border-r` are unaffected — no token is named `b`, `l` or `r`.
- **Aim for zero comments.** A comment is justified only for a constraint the code cannot express —
  engine constants, bit layouts, the WASM boundary, platform workarounds, deliberate perf choices.
- **No `TODO` comments.** Open an issue instead.
- **Package names are `@disa/<folder>`**, and the folder name always matches.

---

## Workflow

`issue → branch (gh issue develop) → commits → PR (Closes #N) → CI green → squash merge`

**No issue, no branch.** Never push to `main`. One PR per issue. Squash merge only. Conventional
commit titles, scope = the `area:` label without its prefix.

Use the `task` skill for the full loop, `i18n-key` when adding a user-facing string, and `dod`
before opening a PR. Use `handoff` when work has to continue in a new chat.

Lefthook installs itself on `bun install` and runs Biome over the **staged files** plus a
whole-project `bun run typecheck` pre-commit, and `bun run test` pre-push. `tsc` has no staged-file
mode, so the staged files decide whether it runs, not what it checks. Staging Rust adds
`cargo fmt --check` and `cargo clippy` at the level `wasm.yml` uses, so an unformatted crate no
longer reaches CI to be told so. `LEFTHOOK=0` or
`LEFTHOOK_EXCLUDE=<job>` skips deliberately — say so in the PR when you do. Details in
`CONTRIBUTING.md` §5.

---

## Commands

```bash
bun install
bun run dev            # vite dev server for apps/web
bun run build          # tsc --noEmit && vite build -> apps/web/dist
bun run typecheck      # workspaces via turbo, then tools/scripts via tsconfig.tools.json
bun run check          # biome — lint + format (check:fix to apply)
bun run test           # vitest, node environment
bun run i18n:check     # en/ru parity + regenerates the typed key union
bun run errors:check   # ErrorCode parity between demo-core and crates/demo-parser
bun run mapdata:generate  # map constants + themed radar images; byte-stable across runs
bun run size           # gzip bundle + wasm against the budgets in AGENTS.md §16 (build first)
bun run size --wasm    # the binary half only, without needing a built dist
bun run wasm:build     # wasm-pack build crates/demo-parser-wasm -> pkg/
bun run wasm:smoke     # call into the built binary — proves it runs, not that it compiled
                       # DISALYTICS_FIXTURE_DEMO=<path> also checks the shape it hands to JS
bun run preview        # build, then serve apps/web/dist through wrangler dev on :8787
bun run smoke <url>    # assert the AGENTS.md §13 deploy contract against a running URL

cargo test -p demo-parser   # parser core, no WASM toolchain involved
```

Still to arrive: `e2e`. See `AGENTS.md` §5 for the full intended set.

---

## Stop and ask instead of guessing

If a task would add a runtime dependency, introduce async I/O into a scrub or render path, change
`SCHEMA_VERSION`, require server-side anything, exceed a budget in `AGENTS.md` §16, move
`clock.frame` into a reactive store, animate during playback, add `wasm-bindgen` to
`crates/demo-parser`, hardcode a user-facing string, or translate game vocabulary — ask.

These are the decisions the documentation exists to protect.
