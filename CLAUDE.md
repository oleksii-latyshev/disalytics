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

**Active work is Phase 5 — the review screen.** What follows is in the order things landed rather
than in order of importance, so the paragraphs that matter most to a change you are making now are
usually the last ones. A phase described below as "under way" means its milestone still has open
issues, not that it is where the work is.

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
canvas and the DOM markers above it. **None of that is on screen any more** — the canvas, both
constants and `KillMarkers` went in #147 and #184, and the layers themselves are kept unreferenced
for a match overlay nobody has built. The measured cost of un-`memo`ing a match's worth of DOM at
10 Hz is the part that outlived them. Read `AGENTS.md` §8 before changing any of it.

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
carries the round**, with the whole-match spine re-scaled rather than discarded — as a 14px ribbon
until #157, which keeps the decision and changes the form.
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
`--blur-*`, because that namespace would build `filter: blur(blur(24px) …)` out of them. The review
screen has since caught up with the document, but the screens in §10 have not — **read §15 before
assuming a component is wrong**, and expect the way in to look half-migrated until step 8 lands.

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
them. The table also contains `C4 Explosive`, and #137 rewrote `docs/DESIGN.md` §6.4 around that:
the bomb stays off the screen as a **rendering rule** rather than for want of data. The prop reports
the bomb only while it is *held*, never while it is stowed, so a carrier indicator would be right
for a moment and quietly wrong for the rest of the round. A `weapon` sample pointing at that entry
draws an empty glyph — not a distinct mark, not a placeholder.

**#140 landed §15's fourth step — the catalog names what it holds.** `CatalogEntry` gained a `meta`
block (file name, map, score, round count, stored-at) and the way in lists it: five rows on the card,
the rest behind a disclosure, each opening from the cache with no file and each removable on the
spot. Four things are load-bearing. **The metadata is written at store time only** — the eviction
contract in `catalog.ts` says a read never writes recency, so `withUse` moves it and carries the
existing `meta` across rather than replacing the entry — while a read that finds *no file* now drops
that entry, because the alternative is a row that can never open. **An entry without `meta` still
parses**: `parseCatalog` normalises rather than filters, so a catalog written before this change
loses names, never entries. **The score is by team** — `matchScore` in `packages/demo-core`, because
`Round.winner` is a side and sides swap; `sideScoreAtFrame`, which `features/review`'s `RoundCard`
still reads, has the bug this avoids and #141 owns it. And **`ParseState.failed` carries an
`OpenFailure` rather than an `ErrorCode`**: a saved demo that has gone is not a parser error and
has no code in the
vocabulary `bun run errors:check` guards. `SCHEMA_VERSION` did not move — `ParsedDemo` is untouched.

**#147 landed §15's fifth step — the review screen is a stage with four cards.** The top bar, both
rails, the inspector column and its drawer are gone; `features/inspector` no longer exists. What
replaces them is one grid, and **the grid is what makes §5.1 structural rather than a promise**: the
plate lives in a cell no card is in, so no card can overlap it, which is what pays for every
`backdrop-filter` on the screen (§2.3). Measured at 1440×900 the plate is **744×744** — the document
predicted 660 — and no card overlaps it at 1440, 1280, 1100 or 1040. `--breakpoint-wide` is 1280 and
`--breakpoint-split` is 1080; below the split the two team cards merge into one strip whose five
seats run **across** it, because a stacked card there left the plate 100px tall. Five things are
load-bearing. **The team rows are the first readers of `SCHEMA_VERSION` 4** — armour, weapon,
grenades and money — and everything on them arrives at the 10 Hz readout, never on the frame channel.
**A bar scales, it does not resize**: `transform: scaleX()`, because `width` triggers layout at every
moment. **`playerRoundStats` is computed for the selected row only** and starts from a binary search;
walking a match's damage for four rows nobody expanded was the cost this avoids. **The `C4 Explosive`
entry draws nothing** — §6.4 as #137 restated it, verified over a play-through where the label never
once appeared. And **the corner cluster carries five icons where §5.4 names three**: close and
audibility are a bridge until the settings sheet exists, and they leave with it. The spine became a
14px `MatchRibbon` whose bands seek and whose density trace is `--ink-dim` at α0.30 rather than
`--damage` at 0.55, which is what #116 asked for; kill marks moved up to `RoundTimeline`, where they
fit. **That ribbon is gone since #184** — read the two paragraphs at the end of this section for what
the bottom of the screen is now. `AGENTS.md` §16's two frame budgets are **measured** rather than
asserted for the first time.

**#154 opened §15's sixth step — the plate — with §6.1's token.** One filled circle for both sides,
a selection ring, a blind countdown disc sweeping over the `Blind` event's own `durationSeconds`, a
death that shrinks to 8px and stays where it fell, and names as haloed text rather than glass chips.
The T diamond and the per-token outline are gone and that is the owner's call, not an omission.
Three things are load-bearing. **The selection ring reads `--ink`, not a literal white** —
`--color-focus` and `--color-playhead` are both `#ffffff` and neither is this ring, and minting a
token for it is a change to `docs/DESIGN.md` §2 that belongs to that document's own issue. **The
needle lengths finally mean what §6.1 says**: they were 13px and 22px measured from the token's
*centre*, so 8 and 17 of them were ever visible. And `blindRemainingBySlot` and
`deathProgressBySlot` sit in `packages/demo-core` beside `damageFlashBySlot`, write into the
caller's typed array, and walk back from a binary search over a window bounded by their own
duration — because they run inside a draw. The label pass moved out to
`features/radar/helpers/labels.ts` when the layer reached 330
lines, and the plate measures pixel-identical either side of that move.

**#166 corrected three sections of `docs/DESIGN.md` from owner feedback of 13 August 2026.** §5.2
splits the old top-left card in two — a centered scoreboard chip at the plate's top edge carrying
map, score and clock, and a round card reduced to the number and the phase — and §5.1 gains that
chip as its **one permitted overlap exception**, with the reasoning attached. §6.1 gained the 8×8
weapon-class glyph beside the name. §15's step annotations were factually wrong since #132, five
steps earlier, and now name the PR that closed each one. **Nothing in that PR is built** — #171 is
the scoreboard and #164 is the glyph.

**#168 and #175 are §6.2 — utility on the plate.** `utilityLayer` draws between the backdrop and the
tokens, so a smoke cloud sits *behind* the players: smoke and molotov as depleting areas, HE and
flash as expanding marks, decoy as a pulse, and a 1px white trajectory for a grenade in flight only.
`--color-nade-decoy` was added to the token layer. Everything is a function of `clock.frame`, so
scrubbing backwards replays it, and **nothing in the draw allocates** — an `Int32Array` of visible
indices once per demo and one mutable scratch object reused every frame. #175 then fixed what
shipped with it: **`detonationTick` being `null` means the ending is unknown, never that the grenade
is still in the air**, and reading it the second way drew 3 of the fixture's 519 grenades from their
throw to the end of the match. `flightEndTick` is now the single definition of where a flight ends
and `isInFlight` sits on top of it, rather than the condition being written twice and drifting.
`trajectoryClipCount` takes the demo's `tickRate` instead of a hardcoded `64`, and `visibleGrenades`
`break`s where it used to `continue`, so it walks a window as its own doc comment always promised.
**The two tests that shipped with the bug asserted it as correct** — that is the thing to look for
when a helper here changes. `grenade-state.ts` is 334 lines with three functions over Biome's
complexity ceiling; those are warnings, CI is green on them, and #172 owns it.

**#177 made play/pause a 40px icon button.** `size="icon-lg"` is a fixed square, so the control's
footprint no longer depends on whether the label says "Pause" or "Воспроизвести" — the row right of
it used to move on every press. The strings did not go anywhere: `controls.play` and
`controls.pause` are the `aria-label` now.

**#157 rewrote `docs/DESIGN.md` §7, as PR #178.** It replaced the 14px `MatchRibbon` described above
with a 32px **list of rounds** — equal-width cells, winner tint, round number, survivor count —
moved #90/#91's economy band and density trace behind the full-height overlay rather than deleting
them, tinted §7.1's kill glyph by the side of the player who died, and added a §15 step 10 for the
implementation. **#182 and #184 built that step**, in the two paragraphs below. The overlay is the
one piece of §7.3 that has no issue and no code; read §7 rather than this summary before touching
the bottom of the review screen.

**#182 scoped the timeline to one round.** `RoundTimeline` is §7.1's axis: the buy phase as a region
of its own, the round's events as glyphs — a skull tinted by the side of the player who died, the
objective marks in `--objective`, a utility glyph per grenade in its own colour — and kills by the
selected player rising while everything else drops to `--ink-faint`. Three things are load-bearing.
**The axis runs to the *next* round's `startTick`, not to `Round.endTick`**, and that is a deliberate
departure from §7.1's letter: the two are five to seven seconds apart, the clock passes through them
at the end of every round, and stopping at `endTick` parks the playhead against the right edge once
per round. The round's close is drawn as a hairline instead and **glyphs still stop at `endTick`**,
so the post-round kills §7.3 refuses to count never appear. One expression in `timelineSegment`
(`features/timeline/helpers/round-axis.ts`) reverts it. **`axisGlyphs` derives a round's events
once per round**, never inside a render at the readout's rate, and **`EventGlyphs` is `memo`'d** for
the reason `KillMarkers` was.

**#184 replaced the ribbon with §7.3's round list, closing #183.** `RoundList` is 32px flush to the
timeline block's bottom edge: one equal-width cell per round tinted by its winner at α0.14, carrying
the round number and the winning side's survivor count, lit by a 1px `--glass-edge` frame while it
plays, seeking to `freezeTimeEndTick` when pressed. Nothing on it is a playhead. Four things are
load-bearing. **The survivor rule lives in `demo-core`** — `roundSurvivors` counts the winning side
out of `Round.economy[].team` and takes off the deaths inside `[startTick, endTick]`, so a slot with
`team: null` is on neither side and a four-man side reads a maximum of four; that is the correct
answer, not an off-by-one. **`matchScore` gained a round bound** rather than a sibling, because the
hover wants the score *after* round N and `sideScoreAtFrame` counts `Round.winner` by side, which is
the bug #141 owns. **`RoundOutcomes` is the list itself** rather than an `sr-only` enumeration beside
a canvas — a cell is an element, so each one carries the whole reading as its accessible name, and
the tooltip is `aria-hidden` because it restates what is already there. And **`helpers/density.ts`,
`helpers/economy.ts`, `helpers/layers.ts` and `EconomyGaps.tsx` are unreferenced on purpose**: §7.3
moves them behind the unbuilt match overlay, `layers.ts` carries a comment saying so, and deleting
them as dead code is the mistake to avoid. The same PR took the axis glyphs from 12px to 24px at the
owner's request — `GlyphSize` in `core/glyphs` is the two sizes, and `GLYPH_PITCH_PX` moved 14 → 24
with them, because the collapse threshold is one glyph's width.

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
