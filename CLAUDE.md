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
`--blur-*`, because that namespace would build `filter: blur(blur(24px) …)` out of them. Every
screen has since caught up with the document: §15's eleven steps are all closed, step 8 last of them
with #236, so the document asks the code for nothing that is not built.

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
block (file name, map, score, round count, stored-at) and the way in lists it: five rows on the
card, the rest behind a disclosure, each opening from the cache with no file and each removable on
the spot. Four things are load-bearing. **The metadata is written at store time only** — the
eviction contract in `catalog.ts` says a read never writes recency, so `withUse` moves it and
carries the existing `meta` across rather than replacing the entry — while a read that finds *no
file* now drops that entry, because the alternative is a row that can never open. **An entry without
`meta` still parses**: `parseCatalog` normalises rather than filters, so a catalog written before
this change loses names, never entries. **The score is by team** — `matchScore` in
`packages/demo-core`, because `Round.winner` is a side and sides swap. `sideScoreAtFrame` sits
beside it in `packages/demo-core/src/helpers/score.ts` and carried the bug this avoids until #171
closed #141; both walk the rounds tracking which slots opened on CT, so a side score belongs to
whoever is playing that side now and a match score names its teams by the side they started on. And
**`ParseState.failed` carries an `OpenFailure` rather than an `ErrorCode`**: a saved demo that has
gone is not a parser error and has no code in the vocabulary `bun run errors:check` guards.
`SCHEMA_VERSION` did not move — `ParsedDemo` is untouched.

**#147 landed §15's fifth step — the review screen is a stage with four cards.** The top bar, both
rails, the inspector column and its drawer are gone; `features/inspector` no longer exists. What
replaces them is one grid, and **the grid is what makes §5.1 structural rather than a promise**: the
plate lives in a cell no card is in, so no card can overlap it, which is what pays for every
`backdrop-filter` on the screen (§2.3). Measured at 1440×900 the plate is **744×744** — the document
predicted 660 — and no card overlaps it at 1440, 1280, 1100 or 1040. `--breakpoint-wide` is 1280 and
`--breakpoint-split` is 1080; below the split the two team cards merge into one strip whose five
seats run **across** it, because a stacked card there left the plate 100px tall. Five things are
load-bearing. **The team rows are the first readers of `SCHEMA_VERSION` 4** — armour, weapon,
grenades and money — and everything on them arrives at the 10 Hz readout, never on the frame
channel. **A bar scales, it does not resize**: `transform: scaleX()`, because `width` triggers
layout at every moment. **`playerRoundStats` is computed for the selected row only** and starts from
a binary search; walking a match's damage for four rows nobody expanded was the cost this avoids.
**The `C4 Explosive` entry draws nothing** — §6.4 as #137 restated it, verified over a play-through
where the label never once appeared. And **the corner cluster carried five icons where §5.4 names
three**: close and audibility were a bridge until the settings sheet existed. It reached seven
before #203 built that sheet and took it back to three. The spine became a 14px `MatchRibbon` whose
bands seek and whose density trace is `--ink-dim` at α0.30 rather than `--damage` at 0.55, which is
what #116 asked for; kill marks moved up to `RoundTimeline`, where they fit. **That ribbon is gone
since #184** — read the two paragraphs at the end of this section for what the bottom of the screen
is now. `AGENTS.md` §16's two frame budgets are **measured** rather than asserted for the first
time.

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
hover wants the score *after* round N; `sideScoreAtFrame` still counted `Round.winner` by side on
the day this landed, which is the bug #141 owned and #171 fixed an hour later. **`RoundOutcomes` is
the list itself** rather than an `sr-only` enumeration beside a canvas — a cell is an element, so
each one carries the whole reading as its accessible name, and the tooltip is `aria-hidden` because
it restates what is already there. And **`helpers/density.ts`, `helpers/economy.ts`,
`helpers/layers.ts` and `EconomyGaps.tsx` are unreferenced on purpose**: §7.3 moves them behind the
unbuilt match overlay, `layers.ts` carries a comment saying so, and deleting them as dead code is
the mistake to avoid. The same PR took the axis glyphs from 12px to 24px at the owner's request —
`GlyphSize` in `core/glyphs` is the two sizes, and `GLYPH_PITCH_PX` moved 14 → 24 with them, because
the collapse threshold is one glyph's width. **Neither the name nor the position survived the
week**: #194 made it `RoundStrip` on the block's *top* row, in separated pills, and nothing on
the block is flush to its bottom edge any more.

**#171 split the old top-left card in two, as PR #187, and closed #141 on the way.** The scoreboard
became a glass chip centered over the plate — map, score, clock — and the round card kept the number
and the phase and nothing else. Three things came with it. **`roundClockAtFrame` replaced
`roundElapsedSeconds`** and returns a phase as well as a number: freeze counts down, live counts up,
post-round holds. **`sideScoreAtFrame` stopped counting `Round.winner` by side** — the halftime bug
— and now tracks which slots opened on CT, which is what #141 was. And **`--backdrop-hud` is the one
`backdrop-filter` in the product over a ground that repaints every frame**; it is 12px against the
panel's 24 for that reason, and it is an exception granted by name in `docs/DESIGN.md` §5.1 rather
than a third blur token to reach for. That chip is the reader's *other* scoreboard position since
#197, and the default spends neither the blur nor the overlap.

**#190 rewrote `docs/DESIGN.md` §7.3 and moved §5.2's scoreboard, and #193 corrected it before the
code arrived.** The round strip became separated pills — a 4px gap, no hairlines, no tint, the round
number as the only text, the winner as a 2px bar on the bottom edge, survivor counts behind a
disclosure — and the halves and overtimes became a gap and a dotted rule derived from the rounds
themselves. #193 is the pattern to copy rather than the exception: building §7.3 found a **24px
control §4 does not allow** and a predicted pill-row width the layout does not produce, and §15 says
the document changes first, by its own issue, so both were fixed in the document before the branch
that implements it merged.

**#194 built that strip.** `packages/demo-core` gained **`matchSegments`**, and it is the
load-bearing part: a boundary falls wherever the majority of the slots both rounds recorded a side
for have swapped, read from `Round.economy[].team`. **Nothing in the product knows what MR12 is** —
MR12, MR15, a match called at 13–3 and three overtimes all come out of that one comparison, and a
tie is not a swap because a two-slot comparison that splits is a substitution rather than a half
ending. `RoundList` is `RoundStrip` and `round-list.ts` is `round-strip.ts`; `RoundOutcomes` keeps
its name, which §7.3 gives it. The expanded survivor tracks are `localStorage`, off by default, and
the disclosure on the strip is their only control — no bridge in the corner cluster.

**#197 raised the scoreboard as a brow on the timeline block, and that is the default position
now.** It is a tab of that card — `--glass-panel`, `--radius-card` above, square where the two meet,
and **no `backdrop-filter` at all**, because it is over the stage rather than over the plate. Two
things are load-bearing. **The join is line-free by construction**: `.glass-panel.has-brow` drops
the block's lit top rim, `.glass-brow` draws hair on three sides only, and the brow paints above the
block's outer hair — a 0.62-alpha lip cannot hide a line drawn beneath it, so removing the rim and
covering the hair are both needed. And **the brow is in flow**, so §5.1's plate re-measures from a
124px block instead of being covered: 716×716 at 1440×900 against the chip's 748. `AGENTS.md` §16's
two frame budgets were re-measured here for the first time since #147 — 0 frames over 16.7 ms out of
399, three runs each.

**#199 took the debug control off the plate, and the lesson is the sweep rather than the button.**
"Show coordinates" had been pinned inside the plate's cell in every build since #147 and survived
#197's overlap check because **that check walked the glass classes**; the sweep that found it walks
`document.querySelectorAll('*')`, and that is the only form of it worth running. Two smaller things
came out of measuring the fix and are easy to undo: the strip over the plate's top edge takes **no
pointer events**, so the canvas is the hit target §9.2's readout needs there, and its inset is
**margin rather than padding**, so with both children silent it is a zero-height box instead of 32px
of nothing over the plate.

**#200 rewrote `docs/DESIGN.md` §10 around a sidebar shell and a library of cards.** §10.1 is a
persistent 17.5rem rail — the same measure as a team card, so the product has one — that **never
appears on the review screen**, with §5.1 as the stated reason: the plate is sized from the
viewport, so a rail is a subtraction from the plate's own axis. §10.2 is a grid of cards over the
five rows #140 shipped, with no team names because `MatchHeader` carries none. The correction that
matters outside §10: **§0's `ogl` row no longer reads as a licence to install it.** It is approved
and deliberately unspent — the two WebGL backgrounds it was approved to buy are deferred in favour
of the dimmed radar image `PlateBackdrop` already ships — and a stale row like that is how a
dependency gets installed by a session doing what the document told it to.

**#203 built §10.5's settings sheet and §10.6's help sheet, and took the corner cluster back to
three.** `@disa/ui` gained `Sheet` and `Switch`: the sheet is a native `<dialog>` opened with
`showModal()`, so the top layer, the focus trap and the `Esc` close request are the platform's.
Three things are load-bearing. **`core/shortcuts` suspends itself while a sheet is open** — a global
handler calling `preventDefault()` on `Escape` cancels the dialog's own close request and locks the
reader in, so `useShortcuts` takes `{ isSuspended }` and that option is not tidiness. **The keyboard
table in help is generated from `SHORTCUT_BINDINGS`**, which is why `useShortcuts` now takes actions
by name rather than key handlers — one source, the same argument §7.3 made for `RoundOutcomes`. And
**`Switch` keeps its knob in a sibling `<span>` with `peer-checked:`** rather than an `::after` on
the checkbox: pseudo-elements on a replaced element only paint after `appearance: none` and not in
every engine.

**#205 quieted the brow and emptied the top-left corner.** The brow carried three typefaces in a
32px lip — Roboto Condensed on the map name and the side letters, Plex Mono on the digits, and the
UI face on the colon nothing had set a face on — and it is one face and two readings now: the score,
with each side's letters in that side's colour so `CT 9` is one token, and the clock behind a 1px
rule. The corner lost its glass and then lost the round: it is the way out of the match and the map
name, two lines of type on `--surface-0`, and **nothing in it is a function of the frame**, so it
stopped re-rendering at the 10 Hz readout. The round number and the phase went because §7.3's strip
already states the round along the bottom of the screen and §7.1's axis already draws the buy phase
— **what is on screen twice is not a reading**. Two consequences to know: leaving the demo is no
longer in the settings sheet (it spent one day there, #203 → #205, and the sheet has no footer at
all), and **the review screen spends no `44`** — §3's one-per-screen rule is the parse screen's now,
and `review.phase.*`, `review.warmup` and `review.roundOfTotal` are deleted in both locales.

**#211 settled the §5.1 plate figure at 1040 and turned a number into a procedure.** The two answers
on record for the same code — 476 and 492 — are not both right: **476 reproduces** and 492 does not,
across a fresh drop and a catalog restore, in `en` and in `ru`. The issue's own hypothesis is wrong
in a way worth keeping: the expanded survivor tracks really do cost 16px, but they cost it at
**every** height-bound width, and 716 and 616 agreed across both runs, so they cannot be what moved
1040 alone. What the run produced instead is the thing to reuse — **a plate figure is only a claim
with a setup**. Three states move the plate below the split and no key records the second of them:
the survivor tracks (−16), a selected player (−81, and nothing at all above the split), and the
scoreboard over the plate (+32, because the brow leaves the block). The locale, the audibility rings
and the debug overlay move nothing. The storage notice in §5.2's corner is a fourth: it is a line of
type in row 1 whenever it speaks, so a run measuring while the demo is still being written reads 459
where a run measuring after it reads 476. `docs/DESIGN.md` §5.1 carries the measured table, the row
arithmetic and the preconditions list; read it before quoting a plate size, and state the viewport
**height** — three of the four widths are height-bound and "the plate at 1040" on its own says
nothing.

**#218 made a team row's numbers wrap, and every figure in that table moved 17px.** Below the split
a seat is 79px of content box against 95px of health figure, helmet and money that nothing shrinks —
107px in `ru`, which is why only Russian pushed the last seat past the viewport and gave the bug its
name; `en` overlapped the seat beside it in silence at the same widths. No horizontal arrangement
fits, so the line wraps and the strip is 17px taller: **1040×800 is 459 by default**, 443 with the
survivor tracks, 378 with a player selected, 491 with the scoreboard over the plate. Above the split
the line is 240px and never wraps, so 1440×900 is still 716. Two things worth keeping. **The sweep
that proves it is #199's** — over `document.querySelectorAll('*')` — and it needs one addition: an
element clipped by an ancestor never reaches the scrollbar, and `sr-only` labels are wide elements
inside a 1px box, so a sweep that does not walk `overflow` for each hit reports them as overflow
every time. And **the reproduction is stateful**: the last CT seat overflows at freeze time, where
every player has a helmet and full money, and not 40 seconds later where the same row is a dead
player holding $100.

**#220 built §10.6's legend, and it is drawn rather than described.** Fourteen marks in the help
sheet — the token and its states, every piece of utility §6.2 draws, the trajectory, and §5.4's
three kill marks — each a 56×28 canvas painted by **the plate's own draw function**, colour off
`RadarColors`. §10.6 only asked the legend to read the same tokens the renderer reads; drawing it
with the same code is what makes drift impossible rather than unlikely, and
`features/radar/helpers/plate-legend.ts` chooses nothing but where in the box a mark sits and how
far through its own life it is caught. Three things to know. **The test is the rule**: every mark
is painted against a palette of sentinels and any colour outside it fails the suite, which is the
only form of this that survives a hurried change. **Three extractions came with it and each removed
a duplicate** — `trajectoryStroke`, the kill line's `drawKillPath`/`drawKillOrigin`/`drawKillFall`,
and `SMOKE_AREA_ALPHA`/`FIRE_AREA_ALPHA`, which `grenadeVisual` had carried as bare 0.30 and 0.25
inside a switch. And **the vision wedge is the one mark not drawn**: its geometry sits around a
gradient the token layer caches across frames, so the entry for a selected player names the cone in
words and §10.6 records why. A canvas cannot carry `aria-hidden` — Biome's a11y rule counts it as
focusable — so the wrapper carries it.

**#202 filled out §10.5's table and closed §15's step 9, absorbing #81 on the way.** Thirteen rows,
and the shape they arrive in is the load-bearing part: `apps/web/src/core/settings` is **one store
with one key per setting**, and a setting is read *where it is obeyed* rather than drilled from the
stage — `RadarView` reads its own four, `RoundStrip` reads the survivor tracks it already had a
control for, and `SettingsSheet` takes two props. `useStoredFlag` is deleted; four of its storage
keys survive it unchanged, and the scoreboard's does not — `disa.review.scoreboardOnPlate` became
`disa.review.scoreboard` carrying a position rather than a boolean, so a reader who had chosen the
plate gets the brow back once. Five things to know. **The palette and the motion override are
document attributes written outside React**: the plate reads its colours out of the computed style,
so an effect would paint one frame of the palette the reader just left. **`radarColors(palette)`
caches on that palette** — the colours go into a layer array, and a fresh object per render rebuilds
every layer on the plate ten times a second. **Skipping the buy phase is `transport.setFrameSkip`,
applied inside `advance` and never inside `seek`**, which is what keeps a hand-scrubbed buy phase
reachable and visible. **The locale stays `@disa/i18n`'s**, because that package reads its key
before React starts and two writers to one key is one too many; `I18nProvider` holds the locale in
state now and ignores a chunk that lands after a second switch. And **the seek step and the
held-arrow rate are stored and obeyed by nothing** — `←` and `→` are §15's step 7, and #202's own
body says so.

**The colour-blind palette in that PR is #81's, and it is measured rather than picked.** Every
candidate was run through a dichromat simulation (Viénot, Brettel & Mollon 1999) for protanopia and
deuteranopia, and the set maximises the *smallest* CIEDE2000 distance over every pair of marks
across normal, protan and deutan vision at once — a floor of **14.28** where the defaults collapse
to **1.79** (`--nade-decoy` against `--objective` under deuteranopia). Two findings outlive the PR.
**`--ct` and `--accent` are ΔE2000 0.9 apart under deuteranopia in the *default* palette** — the
violet accent and CT blue are one colour to a deuteranope — and this palette does not fix it,
because the accent is §2.5's rather than a data colour; what saves the selection ring is that the
ring itself is `--ink`. And **`--nade-flash` sits 3.3 from `--ink` in ordinary vision**, which is
not a deficiency at all: both are white on purpose. `docs/DESIGN.md` §2.4 carries the values, the
method and both exclusions.

**#114 closed §15's step 6 — the plate can be zoomed and panned.** The wheel zooms anchored on the
pointer, a `+`/`−` pair sits on the plate's bottom-right, a drag pans, and a double-click resets;
the range is 1× to 4×. Five things are load-bearing. **The view lives in a mutable box, not in
React** — `features/radar/helpers/view.ts` — for the reason `hoveredKillRef` does: a drag repaints
the layers that already exist instead of rebuilding them, and hard rule 4 stays off the path. The
`zoom` beside it in React state exists only so the `+`/`−` pair knows when it has run out of range;
nothing draws from it. **The transform enters through each layer's own `scale`, and the pan through
`context.translate`** — all four layers already derived `size.width / RADAR_IMAGE_SIZE` in one line
each — so the world scales and everything measured in device pixels does not; a needle, a halo and a
hairline are the same width at 4× as at 1×. **The token is the one mark that follows the zoom**, and
`readPlateGeometry` clamps it to §6.1's 12–20px, which is why the five draw helpers in `tokens.ts`
now take a radius instead of reading the constant. **A label whose token the zoom has left off the
plate is dropped rather than clamped** — clamping is what grew a row of names along the edge of a
panned plate, and it is the one defect the browser found that the types could not. And **nothing was
bound to the keyboard**: §9.1 gives `0` to the zoom reset *and* to the last seat of `6`–`0`, so both
rows wait for §15's step 7 to settle it at once. Two corrections ride with it — §6.3 asked for
`Cmd`/`Ctrl` + drag where §9.2 asked for a plain drag, and the pointer section wins; and
`AGENTS.md` §16's two frame rows carry a `320f821` baseline and a measurement at the 4× ceiling,
both **0 over 16.7 ms across three passes of 399 frames**.

**#163 put gunfire in the schema, and took `SCHEMA_VERSION` to 5.** `MatchEvents.shots` is one entry
per trigger pull with a gun — tick, shooter, weapon — and the load-bearing decision is **which
event it comes from**. Upstream carries two: `weapon_fire` (4,788 on the fixture) fires for guns,
thrown grenades and knife swings alike and names its weapon `weapon_ak47`, which is the fifth
vocabulary `docs/PARSER.md` §17 counts and the one nothing here can map without #53;
`fire_bullets` (3,500) fires when a bullet leaves a gun and carries an **item definition index**,
which is the route `MatchHeader.weapons` is already built through. So `Shot.weapon` is an index
into that per-match table and means exactly what `TickTrack.weapon` means at the same tick — no
sixth namespace, and on the fixture **all 3,500 shots resolved into the table**. Four things to
know. **The two events join weapon for weapon** — AK-47 1,280 in both, M4A1-S 625, M4A4 359, over
18 guns — which is what says `fire_bullets` counts trigger pulls rather than bullets in flight; the
one exception is a single Glock-18, 203 against 202, and it is recorded rather than modelled.
**A shotgun is unverified**: the match held a MAG-7 and an XM1014 but fired neither, so whether
nine pellets are one event or nine is an open question and §18 says so instead of assuming.
**The shape is a plain sorted array** — hard rule 3's default — because 3,500 events three fields
wide is four times the damage array and a third of `item_equip`, so §10's columnar exception was
measured and not taken. And **the cost is nothing measurable**: 16.31 s → 16.09 s native and
19.94 s → 20.06 s in the browser, three runs an arm each way. `weapons::index_in` is the definition
index → table index lookup, unit-tested against the display-name route so the two cannot drift.

**#226 bound the rest of §9.1, and the held arrow is the part with a design in it.** A tap on `←`
or `→` seeks by §10.5's step; the *keyboard's own repeat* is what turns the same key into a hold,
and a hold is a **rate the transport owns** — `Clock.scrub` beside `Clock.speed`, signed by the
direction — rather than a stream of seeks. Five things are load-bearing. **`scrub` is beside `speed`
and never written over it**, because §7.2 says a temporary rate must not light a button the reader
did not press; the speed control shows the chosen speed and a `⏵⏵` mark whose box is always there,
so the row cannot move at the moment a scrub starts. **A release has three sources** — `keyup`,
`blur` and `visibilitychange` — and `useShortcuts` owns all three, because a key let go outside the
window never reports itself and would leave the match running fast for ever; `pause()` ends a hold
as well, so a sheet raised mid-hold cannot restore a play state that is no longer true. **The
buy-phase skip stands aside while `scrub` is set**, for the reason it stands aside for `seek`:
rewinding into a phase the rule skips has to land there instead of being pushed back out of it once
per animation frame. **A press that was already handled never reaches a binding** — `useShortcuts`
returns on `event.defaultPrevented`, which is what stops a roving-focus group's `←` from both moving
the focus and seeking the match, and `input[type="range"]` keeps its own arrow keys by name. And
**`0` is the last CT seat**: the row keys are a contiguous range and cannot give up their last
member, while `−` held down reaches 1× where the pan is pinned — so the floor of the zoom *is* the
reset, and `docs/DESIGN.md` §9.1 records that rather than leaving the collision open. The zoom's two
keys are bound in `features/radar` from a second `useShortcuts` call, whose suspension arrives as a
prop; nothing new is on the frame path, so §16's rows were not re-measured.

**#164 put three marks on the token, and the one to know about is where the shapes come from.**
A weapon silhouette beside every name, a hollow in a walking player's token, and a white spur past
the needle on the frame a trigger was pulled — §6.1's last three states, and the first readers of
`MatchEvents.shots`. Five things are load-bearing. **The silhouettes are §5.3's own**: they moved
out of `WeaponGlyph` into `core/glyphs/helpers/silhouettes.ts` because the set has two renderers,
and the canvas compiles each class to a `Path2D` **once per session at plate scale** rather than
scaling the context — `context.scale` shrinks the stroke with the shape and would halo a mark more
faintly than the name beside it. **The box is 14×7 and `docs/DESIGN.md` §6.1 says 8×8 no longer**:
the square was specified before anything was drawn, and the same set squeezed into it turned every
long gun into the letter T — that was found by looking at it, which is the only way it could have
been. **The mark's box is reserved whether or not a mark goes in it**, so a name never twitches
sideways when its player switches weapon, and `C4 Explosive` leaves it empty (§6.4) — verified over
all 30 rounds, 84 of 630 sampled frames with a live carrier and no mark on any of them. **`walk` is
a hole and not a ring** because audibility, selection and the objective arc have every radius
outside the token, and walking is the thing that suppresses the audibility ring. And **the spur is
drawn from the facing angle whether or not the needle is** — a blinded player still pulls a trigger.
`gunfireBySlot` is `damageFlashBySlot`'s shape in `packages/demo-core`; `weaponClasses` resolves the
per-match table once per demo so a token reads its class by index. `AGENTS.md` §16's two rows were
re-measured with a `3b29b62` baseline beside them: **0 frames over 16.7 ms out of 399, three passes
an arm, both arms**.

**#164 is also the second half of a documentation gap worth recognising by shape.** #162 asked §6.1
for three marks; #166 wrote one and the issue was closed anyway. Nothing caught it for five months
because the *issue* was closed — so when an issue says "the document changes first", check the
document rather than the issue's state. The walk and the fire were settled with the owner at the
start of #164 and written into §6.1 in the same PR as the code, which is the standing rule for docs
here; §15's exception is for a decision that has to be made before code, and asking is what made it
one.

**#233 opened §15's step 8 — the way in is a shell with a persistent rail.** A 17.5rem
`--glass-panel` rail over the dimmed radar backdrop that already shipped: the product name, then
Upload, Library and the two screens that are coming at 40px each, then settings and help in the
foot. Three things are load-bearing. **Below `--breakpoint-split` the rail is a row above the
content**, and its foot rides at the end of the entry line rather than under it, so the order the
eye reads is the order `Tab` takes — `order` or a moved `grid-area` would have cost that. **The
shell ends where the match begins**, and §5.1 is the reason rather than a preference: 280px beside
the plate is not chrome, it is a subtraction from the plate's own axis. And **two corrections to the
document rode with the code** — §10.1's faint labels on the unfinished entries lost to §14's ink
floor, so a "soon" chip is what tells them apart, and the product name is the rail's alone, because
the card two hundred pixels away leading with the same name is §5.2's lesson from #205 about what is
on screen twice. "Show all" became a route to the Library screen rather than an expansion in place,
and `library.saved.showFewer` is deleted in both locales.

**#238 is the bug that shipped inside it, and the shape is the part worth keeping.** #233 pinned the
view with `state.status === 'idle' ? chosenView : 'upload'`, and `failed` is not `idle` either — so
pressing a saved demo whose cached file had gone left every rail entry inert, with nothing on the
failure screen able to return the state to `idle`. The move is made **once, where the reader asks
for it** now: an open switches to the upload view and then leaves the rail alone. Leaving a failure
ends it, and a parse still running is untouched, because `close` terminates the worker and
navigating away is not cancelling.

**#234 made the library a grid of cards over the metadata #140 writes.** The thumbnail is the same
radar asset the plate draws, in the theme §10.5 chose, so the grid adds no image to the build; it
names the map and not the match, and the file name is what tells two Mirage demos apart. **The
header states two storage figures from two places**, which is the thing not to collapse into one:
the demos' own total is the exact sum of `byteLength` in the catalog against `CACHE_BYTE_LIMIT`,
because that ceiling is what evicts, and the device's is `navigator.storage.estimate()` over the
whole origin, padded by browsers and quoted as an estimate rather than as the limit.
`storageEstimate()` joins `requestPersistence` in `packages/demo-store`, so `navigator.storage`
stays behind one door. No team names — `MatchHeader` carries none, so the card promises none.

**#235 made a card open into a dialog that draws its own plate**: one frame of the cached parse at
the first round's buy, the roster by the side each slot held *that round*, and every round as a way
in. `@disa/ui` gained `Dialog`, `features/radar` gained `PlateStill`, `features/library` gained
`DemoDialog`. Three things are load-bearing. **The dialog is the card itself** rather than a card
inside a full-viewport `<dialog>`, and that is what lets light dismiss be the platform's —
`closedby="any"` fires on a press *outside the element*, and an element covering the viewport has no
outside; Safari has no `closedby`, so it is set behind a feature test with the press-outside
listener as the fallback. **A still has no clock**: `useCanvasLayers` already paints on a layer
change, so nothing on this screen subscribes to a frame channel, and utility, the kill line and
audibility are off rather than read from §10.5, because each answers a question a *moving* plate
raises. And **the chosen round reaches the match as state rather than as a seek** —
`ParseState.ready` carries a `roundIndex`, so the match's first painted frame is the round the
reader picked. A stored thumbnail was rejected for the three reasons §10.2 lists, the parse being in
the cache already.

**#236 moved the parse and the failure screens inside the shell, and step 8 is complete.** Neither
navigates and neither is a block stacked on the way-in card: both are the upload view transformed in
place. **The progress bar is gone** — it stated the same fact as the number beside it — and
`role="progressbar"` rides on the percentage itself, with the stage line as its *sibling*, because
that role names its element by `aria-label` and never by its content. **There are two stages and not
§10.3's three**: `ParsePhase` is `decompress` and `parse`, because the demo's three passes are
upstream's and are not reported separately. The failure screen **carries no `--damage`** — §2 leaves
that token exactly one reader, §6.1's damage flash — and it keeps the route out rather than
apologising above an untouched "Open a demo" card.

**#68 says why a parse in a hidden tab takes five times longer**, which no code here can prevent: a
backgrounded renderer is confined to efficiency cores, and the fixture that reads in 15.3 s in front
takes 84.9 s behind. Three things are deliberate. **The note is earned and carries no number** — it
appears only once the tab has actually been backgrounded during that parse, and 5× is one machine
against one fixture. **`wasHidden` is set once and never unset**, and the reducer returns the same
state object on later trips, so a tab that leaves four times says it once and re-renders nothing.
And **the listener lives with the parse**, registered after `parseStarted` against its own
`AbortController` and aborted in a `finally`; it reads `document.hidden` at registration, because a
tab already hidden when the worker starts will never fire `visibilitychange` to say so — which is
exactly what the in-app browser pane serves.

**#228 raised the stage's controls out of the hot corners, closing §15's step 7.** §9.3's two live
regions: the top-right quadrant lifts §5.4's cluster out of `--ink-faint`, and in fullscreen the
timeline block leaves after three seconds of stillness and the bottom 80px brings it back. Four
things are load-bearing. **The block is taken by stillness and given back by the edge** — that is
§9.3's rule rather than the usual one, so a nudge of the mouse in the middle of the stage does not
flash the controls back over the match — with focus as the necessary exception, and that listener
lives in the hook because a static element carrying `onFocus` is a Biome a11y error and the wrong
owner besides. **It keeps its space**, because §5.1 sizes the plate out of the row it sits in and a
collapsing block would resize the plate mid-round. **`translate` is not `transform`**: Tailwind's
`translate-y-*` writes the individual property, so `transition-[transform,opacity]` leaves the slide
snapping while the fade runs, and the first version of that branch had exactly that defect. And
**opacity is what hides it**, not the slide, because the stage's bottom padding is shorter than the
block.

**#241 took `--ink-faint` off everything with a reading in it**, which §14 has forbidden since #130
and eleven sites did not obey. Nine were words and moved to `--ink-dim`; seven keep the token
because none of them is text — four icons whose SVG inherits it, three separators the reader never
hears. **The dead row needed deciding rather than fixing**: §5.3 asked for a dead player's name at
that ink, `--ink` → `--ink-dim` is the step the row already spends on its own secondary numbers, and
the chip beside the name states the reading in words, so §5.3's table says so now. §14 gained the
line the code can be checked against — a mark, an unvoiced separator and a disabled control may sit
at that ink, and anything with a reading in it may not.

**#244 made `bun run i18n:check` fail on a key nothing reads**, which both existing halves were
blind to because both were about parity. A quoted string counts as a reader only when its first
segment is one of the ten namespaces, so `catalog.json` and `disa.review.scoreboard` are not
mistaken for keys; and **every template literal starting with a namespace becomes one regular
expression**, its interpolations replaced by `[^.]+`. That second half is why **there is no
exception list**: the prefix allowlist the issue offered would have needed eight prefixes covering
43 keys, each one a licence for everything beneath it, where a pattern derived from the template's
own literal parts covers the same 43 exactly. Two keys were unread and are deleted; both had
outlived the components that rendered them.

**#232 and #250 are the two splits the last month of marks made necessary.** `layers.ts` is
`token-layer.ts` at 297 lines, with the vision wedge, the projection pass and the backdrop in
modules of their own — `visionWedge()` is a **factory** rather than a function, so the gradient
cache moves with the geometry — and both extracted modules are unit-tested, which the closures they
came from could not be. `RadarView.tsx` is 250, with `usePlateNavigation` owning the wheel, the
drag, the double-click reset, the `+`/`−` pair and §9.1's two keys. Three decisions there to leave
alone: **the view box stays in `RadarView`**, because a hook that created it could not be called
before `useCanvasLayers` needs it; **`onPointerLeave` stays on the canvas**, because the readout has
to be cleared whether or not it is currently being fed; and **the wheel is still an effect owning
its own listener**, because it must be non-passive and React's delegated `onWheel` cannot promise
that. #232 also removed §10.6's stated reason for the legend not drawing the vision wedge — it is a
choice about the swatch now, and #249 is where it gets made.

**#104 assembles the interface when a parse completes — §8's one orchestrated moment.** The five
cells of `MatchReview` are `m.div`s carrying their own `initial`/`animate` from the new
`apps/web/src/core/motion`, and §7.3's round pills are `m.li`. Three things are load-bearing.
**There is no orchestrating parent**, deliberately: the grid is the only thing that knows which edge
a card is pinned to. **There is no "already played" flag**, and adding one is the mistake to avoid —
"once per demo" holds because the screen mounts once, measured at 0 deviations over 1,499 frames
while a sheet opened, the locale switched to `ru`, players were selected and the viewport crossed
the split. And **the strip fills over a fixed span divided among its rounds** rather than a step per
pill, so a match with three overtimes fills in the same time as a short one; there is a test.
Reduced motion is `MotionProvider`'s and not a second implementation —
`packages/ui/src/styles/motion.css` covers transitions, not `motion`'s JS animations. One §8
correction rode with it: the players stand on the starting frame while the plate fades in, because
"players take up their positions" as a separate movement is a wall-time twin inside a canvas, which
rule 3 of that same section forbids.

**#173 gave a smoke that detonates an ending it can be drawn with, and `SCHEMA_VERSION` is 6.**
`area_expiry` is read off the projectile's own trajectory and `smokegrenade_expired` is not read at
all — **which is more precise rather than less**, and reverting it to the event is the change not to
make. On the fixture 11 of 136 smokes have no expiry event on any tick, because the engine deletes a
cloud still standing at the round's cleanup silently; for all 125 that do have one, the difference
between the event and the last sample is a set with a single member, `{1}`. `decoy_detonate` is
likewise a decoy's *end* rather than its start, which is why the decoy's `detonation_tick` moved to
`decoy_started` in the same PR — without that it gets an area of zero length and still does not
draw. Fire needed nothing: 114 `inferno_startburn` against 114 `inferno_expire`, every one paired.
`docs/PARSER.md` §19 carries the table. **`demo-core` is untouched on purpose** — `grenadeVisual`
and `visibleGrenades` both discard a grenade whose `detonationTick` is `null` before they look at
expiry, so #169's fix still holds.

**#63 names the match history folder for the reader's own OS**, which is the half of §12's empty
state #52 left. The path is chosen from what the platform reports — User-Agent Client Hints where
the browser has them, the user agent string where it does not, and the pathless copy where neither
names a platform that has a Steam folder. Three things to know. **`matchHistoryFolder` is given the
report as strings** rather than reading `navigator` itself, which is what keeps the choice
unit-tested in the node environment, and it rules out the two traps a naive sniff walks into:
Android carries `Linux` in the same string, and an iPad asking for the desktop site calls itself a
Macintosh, which only `maxTouchPoints` tells apart. **The path is game vocabulary** — one string in
both locales, rendered through `<code>` rather than `<Text>` — and it is interpolated into a whole
sentence, which is what `<Text>` needed a `RichTranslationValues` for; `useT` keeps the narrow type,
because an `aria-label` cannot hold a node. And **it wraps rather than truncating**: the Windows
path fits no width the card has, and a path with its middle elided names nothing.

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
bun run i18n:check     # en/ru parity, every key read + regenerates the typed key union
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
