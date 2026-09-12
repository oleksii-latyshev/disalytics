# CLAUDE.md

Entry point for AI agents. This file is loaded automatically every session; the full contract is
not. Read the companion documents before doing the matching work — do not work from this summary
alone.

| Document | Read it before |
|---|---|
| `AGENTS.md` | any non-trivial task — it is the operating contract |
| `CODE_REQUIREMENTS.md` | writing any code |
| `CONTRIBUTING.md` | creating an issue, branch, or PR |
| `packages/ui/src/styles/tokens.css` | any visual or component work — it replaced `DESIGN.md` |
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

> **The visual system was replaced on 1 September 2026.** `DESIGN.md` is deleted; #276 built a
> new token layer in its place and #277–#280 apply it screen by screen. Everything below this line
> is a **record of what each pull request did**, and where it describes a surface — glass cards, the
> violet accent, `backdrop-filter` over the plate, three type families, the layout rule that kept
> cards off the radar — it is describing what was there, not what is there. For the current system
> read `packages/ui/src/styles/tokens.css` and `AGENTS.md` §17. What survives unchanged is
> everything about *behaviour*: the clock, the frame channel, the worker protocol, the store, the
> keyboard bindings and the parsing rules.

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
the deploy smoke test is green — and since #144 it names the binary the deployed page references
rather than the local build's, which is what makes it green off CI as well.

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
`core/shortcuts` binds `DESIGN.md` §9 (deleted — see the note above)'s keys. The scrubber is an **uncontrolled** range input —
React never owns its value — and the playhead moves with `transform` only. What #83 left was a bare
strip: hairlines and a playhead, nothing about the match itself.

#87 put those panels into the `DESIGN.md` §4 layout. An opened demo is no longer a block in the
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
`MotionProvider` in `@disa/ui`, at the time a `strict` `LazyMotion`, so `motion.*` threw and `m` was
the only way to animate — `strict` went in #276 and `LazyMotion` itself in #284. Animate UI's registry is configured in `packages/ui/components.json`, and its aliases are
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
is `DESIGN.md` §8's test for what may move while playback runs, and it is why scrubbing
backwards through a hit shows the flash again. **The rules live in `packages/demo-core`**:
`helpers/audibility.ts` is the model, `helpers/player-state.ts` is `damageFlashBySlot`,
`blindedBySlot` and `bombProgressAt`, and both are unit-tested there rather than eyeballed on a
plate. The two per-slot lookups write into the caller's typed array because they run inside a draw,
and every event lookup is `lastIndexAtOrBefore` plus a walk backwards bounded by the window rather
than by the match. The audibility numbers are a named approximation of an unpublished falloff, and
**the ring itself starts off** behind a top-bar toggle remembered in `localStorage` — it is the
largest mark on the plate and it competed with the players. Read `AGENTS.md` §9 before changing any
of it.

**#130 rewrote `DESIGN.md` from the ground up, and most of the UI described above is now
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
makes `backdrop-filter` affordable and is a layout rule rather than a convention. `DESIGN.md`
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
them. The table also contains `C4 Explosive`, and #137 rewrote `DESIGN.md` §6.4 around that:
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
token for it is a change to `DESIGN.md` §2 that belongs to that document's own issue. **The
needle lengths finally mean what §6.1 says**: they were 13px and 22px measured from the token's
*centre*, so 8 and 17 of them were ever visible. And `blindRemainingBySlot` and
`deathProgressBySlot` sit in `packages/demo-core` beside `damageFlashBySlot`, write into the
caller's typed array, and walk back from a binary search over a window bounded by their own
duration — because they run inside a draw. The label pass moved out to
`features/radar/helpers/labels.ts` when the layer reached 330
lines, and the plate measures pixel-identical either side of that move.

**#166 corrected three sections of `DESIGN.md` from owner feedback of 13 August 2026.** §5.2
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

**#157 rewrote `DESIGN.md` §7, as PR #178.** It replaced the 14px `MatchRibbon` described above
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
panel's 24 for that reason, and it is an exception granted by name in `DESIGN.md` §5.1 rather
than a third blur token to reach for. That chip is the reader's *other* scoreboard position since
#197, and the default spends neither the blur nor the overlap.

**#190 rewrote `DESIGN.md` §7.3 and moved §5.2's scoreboard, and #193 corrected it before the
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

**#200 rewrote `DESIGN.md` §10 around a sidebar shell and a library of cards.** §10.1 is a
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
where a run measuring after it reads 476. `DESIGN.md` §5.1 carries the measured table, the row
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
not a deficiency at all: both are white on purpose. `DESIGN.md` §2.4 carries the values, the
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
reset, and `DESIGN.md` §9.1 records that rather than leaving the collision open. The zoom's two
keys are bound in `features/radar` from a second `useShortcuts` call, whose suspension arrives as a
prop; nothing new is on the frame path, so §16's rows were not re-measured.

**#164 put three marks on the token, and the one to know about is where the shapes come from.**
A weapon silhouette beside every name, a hollow in a walking player's token, and a white spur past
the needle on the frame a trigger was pulled — §6.1's last three states, and the first readers of
`MatchEvents.shots`. Five things are load-bearing. **The silhouettes are §5.3's own**: they moved
out of `WeaponGlyph` into `core/glyphs/helpers/silhouettes.ts` because the set has two renderers,
and the canvas compiles each class to a `Path2D` **once per session at plate scale** rather than
scaling the context — `context.scale` shrinks the stroke with the shape and would halo a mark more
faintly than the name beside it. **The box is 14×7 and `DESIGN.md` §6.1 says 8×8 no longer**:
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

**#152 gave a grenade one name whether it is held or carried.** A team row stated the same object
twice — the weapon slot off `MatchHeader.weapons` (`High Explosive Grenade`), the utility marks
beside it off `UTILITY_NAMES` (`HE Grenade`) — and a screen reader heard both. `weaponName` in
`packages/demo-core` is the one name to show: utility defers to `UTILITY_NAMES` and everything else
keeps its table entry, which is the only name it has. **The deference only runs this way round** —
the table separates a `Molotov` from an `Incendiary Grenade` and the `grenades` bitfield cannot, so
any answer that leaves either reading on the table still disagrees for one of them. The pair
collapses to `Molotov`, argued in the constant's own comment: it is what both are called in play,
where `Incendiary Grenade` names the CT's item alone. **The kill feed is deliberately untouched** —
it states a weapon in upstream's *internal* vocabulary (`ak47`, `hegrenade`), which is the third
vocabulary in the product and #53's to close.

**#253 is the third of those splits, and the seam it *refused* is the point.** `MatchReview.tsx` is
253 lines: §9.1's whole binding table moved to `use-review-shortcuts`, which also reads the two
settings the arrow row obeys — once the table lives there, a key binding is read where it is obeyed
like every other row of §10.5 — and the surfaces that cover the stage moved to `use-review-sheets`
and `ReviewSheets`, with the open sheet the only thread back to the bindings. **The grid did not
move.** Five cells and their `grid-area`s in one file is what makes §5.1 checkable by reading, and
splitting them into components puts that proof in five places. Two things measured rather than
asserted, both arms on one parse: the plate is **716 at 1440×900 and 459 at 1040×800**, unchanged
and matching §5.1's table, and the plate is pixel-identical across **14 states — 7 rounds × a player
selected or not — 14 distinct hashes, 14 of 14 matching** either side of the move. The assembly is
unchanged and still runs once: 47 of the arrival's 232 frames sit below full opacity, and 0 of the
419 after it, across a sheet opened and closed, a player selected and a round seeked.

**#260 gave the weapons back their names, and the shape of the answer is the part to keep.** §5.3's
row and §5.4's feed drew one rifle for an AK, an M4A4 and an M4A1-S, which is a feed that says *a
rifle* to a reader asking *which*. What draws there now is Valve's own outline, arriving the way the
radar images do — extracted from the depot by
[`Juknum/counter-strike-icons`](https://github.com/Juknum/counter-strike-icons), committed under
`apps/web/assets/weapon-icons/`, credited in the README, and never fetched by anything here. Five
things are load-bearing. **The icon id is the internal vocabulary**: Valve names the files `ak47`
and `m4a1_silencer`, which is exactly what `Kill.weapon` carries, so a kill's icon is a set
membership test and there is no fourth namespace — `killWeaponIcon` has no table at all, and only
the display names needed one, as a second column on the table that already listed them. **The type
is the guard.** The generated record is `Record<WeaponIconId, WeaponIcon>` against a list
`demo-core` owns, so an id the vocabulary names and nobody shipped is a compile error rather than an
empty glyph; no runtime check exists because none is needed. **Valve's curves do not ship** — 506 kB
of path data, 44 kB gzipped, for 36 icons — so `bun run icons:generate` flattens them to polygons
and simplifies at **0.3 of the icon's own 32-unit height**, which is 25 kB and is indistinguishable
from the source at 10px and at 26px, checked icon by icon. **The plate keeps the class set**, and
that is §6.1's own finding one size up: a model outline in a 14×7 box is a smudge, so the two sets
are two resolutions rather than two drawings of one thing. And **an unmapped weapon still draws** —
it falls back to its class, the way `weaponClass` answers `unknown` rather than failing, which is
why this needed nothing from the blocked #53. What it deliberately did not touch: the feed still
*says* `ak47` in its accessible name, which is #258.

**#261 is the fourth of those splits, and what moved is a vocabulary rather than a concern.**
`packages/demo-core/src/helpers/weapons.ts` had grown to 313 lines holding two things that never
ask each other anything: **what a weapon is** — the two vocabulary tables, the class, the icon — and
**what utility is** — `UtilityKind`, `utilityKindOfGrenade`, `UTILITY_NAMES` and the `grenades`
bitfield. The second half is `helpers/utility.ts` now, and the barrel exports exactly what it
exported before, so no consumer moved. Two things to know. **The dependency runs one way and had to
be made to** — `isUtilityKind` stayed with the weapon half, because it narrows a `WeaponClass` and a
`WeaponClass` is a weapon-half type; moving it would have put an import back the other way and
closed the loop the split exists to open. And **`UTILITY_KINDS` is derived from `UTILITY_NAMES`
rather than restated**, which is the one line here that is not a move: a literal list of the six
kinds in `weapons.ts` would have been the enumeration living in the file that no longer owns it. The
tests moved with the code — `__tests__/utility.test.ts` is `utilityKindOfGrenade`, `utilityHeld` and
`UTILITY_NAMES` — and `demo-core` is 208 tests either side, none of them edited.

**#172 took the last three complexity warnings off the tree, and one of them was a real duplicate.**
`bun run check` reports nothing at all now, for the first time since #168 shipped them.
`grenadeVisual` is `writeBurst`, `writeArea` and `writeDecoy` — the smoke and molotov arms were the
same fifteen lines with a different alpha constant, which is what the warning was pointing at — and
`visibleGrenades` hands its type dispatch to `isVisibleAfterDetonation`, where the four types with an
expiry answer in one arm rather than in two identical ones. The utility layer's closure held **two
decisions**, the phase and the type; `drawGrenade`, `drawFlight` and `drawDetonation` are
module-level now and take one `UtilityDraw` **allocated once per demo and rewritten in place**,
which is the part not to undo — an options literal per grenade per frame is exactly the allocation
`AGENTS.md` §9 keeps out of a draw. Nothing else changed: 208 `demo-core` tests pass unmodified, and
§16's two rows were re-measured against a `7e3967f` baseline in the same hour — **0 over 16.7 ms in
every playback pass on both arms**, and one 16.8 ms scrub frame that appears once on each arm in a
different pass.

**#176 rode with it, and the finding is bigger than the doc fix.** A `GrenadeTrajectory` is where the
projectile *was* for as long as it existed, never where it flew — measured over all 519 grenades of
the fixture, a smoke's trajectory runs a **median 22.0 s past its detonation** and an HE's runs
**5.0 s in 153 cases out of 153**, while a flash and a fire stop at the detonation to within 0.1 s.
The molotov half is the answer #176 asked to be measured rather than assumed: the projectile really
does die on impact, because the fire is a *different entity* (§19's `inferno_startburn`), where a
smoke's cloud **is** the projectile. `docs/PARSER.md` §20 carries the per-type table, and the schema's
own doc comment stopped saying "flight path". Nothing in the code changed — `trajectoryClipCount`
already clips at `detonationTick` — and `SCHEMA_VERSION` did not move.

**#264 is the fourth split, and the seam is the one #172 left visible.** `grenade-state.ts` came
out of that PR at 343 lines with its own section rules drawing the line: **where a projectile is
while it is in the air** — `FLIGHT_SLACK_SECONDS`, `flightEndTick`, `isInFlight` and
`trajectoryClipCount`, which are the two routes `docs/PARSER.md` §20 points a reader at — against
**what it draws once it lands**. The first half is `helpers/grenade-flight.ts` at 61 lines and the
second stays at 285, the barrel exports the same 135 names, and `grenade-state.test.ts` lost 59
lines and gained none. Two things to know. **`MAX_VISUAL_SECONDS` moved and `FLIGHT_SLACK_SECONDS`
did not** — the first was filed under the flight heading but is read only by `visibleGrenades`, so a
constant went to the file that reads it rather than to the file that had been keeping it. And
**nothing was re-measured**, deliberately: a move that adds one cross-module import to a function
already called per grenade per frame is not a shape change, and §16's rows were taken against
`7e3967f` one PR earlier.

**#215 gave `useRovingFocus` a ref callback that keeps its identity, and the shape is a registry
rather than a memo.** `register` was memoised but it is a *factory*: the closure it returned was a
new function every call, and React treats a ref whose identity changed as a different ref — it calls
the old one with `null` and the new one with the node. Both consumers are groups of tens of items
that re-render for reasons unrelated to refs, so a hover over `EventGlyphs` was detaching and
reattaching every glyph in the round. `shared/hooks/helpers/item-refs.ts` is a `Map<number,
callback>` behind a lazily-created ref, and it is a **separate module on purpose**: `apps/web`'s
vitest runs in the `node` environment over `*.test.ts` only, so a hook cannot be rendered in a test
here and the stability claim would have been unprovable inside the closure. It is five unit tests
now. Two things to know. **The callbacks read no `count`**, which is what keeps the hook's own note
about a shorter match true — they write one slot and nothing else. And **the map only grows**, the
way the node array always did; an index the group shrank past keeps a `null` React already wrote
there.

**#126 rode with it and is the reason a screenshot criterion is now satisfiable.**
`CONTRIBUTING.md` §4 has an **Evidence for screen work** section: attaching an image to a pull
request needs the GitHub web UI and there is no `gh` or REST path for it, so a criterion saying "in
the pull request" is read as "to the owner". The **review screen is never attachable at all** —
ten real names and SteamIDs — and the section lists what stands in for a picture along with the CDP
capture recipe, so the next screen issue does not rewrite it. Four lines there each cost a session:
assert the viewport and `visibilityState` inside the run, kill the browser by its profile path and
never by the binary name, delete the profile because its OPFS holds a parsed copy of the demo, and
ask for the demo again every session.

**#268 made the axis glyph a hit slot, and the thing that decided the shape is the browser rather
than the layout.** A glyph button was shrink-wrapped to its 24px mark with a 4px overrun, so where a
round's events cluster a later sibling covered an earlier one's centre and took every press aimed at
it — 413 of the fixture's 751 glyphs, one press landing on a mark **16.43px** away. The button is
the *target* now: centred on the mark, stopping half way to the nearest neighbour, and the mark is
laid over it with `pointer-events-none` rather than sitting inside it. Four things are load-bearing.
**The mark must not be a target** — the first version of this branch set the width and left the
24px symbol taking pointer events, which reproduced the original bug exactly and measured no better
than `main`. **There is a one-pixel floor**, and it exists because hit testing works in whole
pixels: Blink rounds the point and snaps the box, so a sub-pixel slot is a mark the pointer cannot
address at all — mapped in the page by sweeping `elementsFromPoint` across a pair at 0.25px. That
floor is also why the remaining 47 misses are misses: they are neighbours **within 0.97px**, and 18
pairs on the fixture share a centre exactly. **Positions stay honest** — spreading a cluster was
the rejected alternative, because a glyph moved off its own moment is a lie about time on a time
axis. And **`hasRoomForGlyphs` keeps its average**: collapsing a whole round's symbols because one
pair is close costs twenty-four legible marks to fix two, and the press is fixed elsewhere now.
`glyphHitHalves` is its own module beside `round-axis.ts`, which is already over the line at 307.

**#258 gave a kill's weapon a name, and the shape is a bridge with exactly one column.** The feed
said *«kills … with ak47»* in `en` and *«убивает … — hegrenade»* in `ru`, because `Kill.weapon` is
upstream's internal vocabulary and reached the sentence unmapped. `ENTRY_BY_INTERNAL_NAME` in
`packages/demo-core/src/helpers/weapons.ts` maps that vocabulary to the entry the same object has in
`MatchHeader.weapons` — and **maps nothing else**, which is the decision to keep: the class was
stated twice before this, once per table, and `killWeaponClass` now reads it off the display table
through the bridge, so the day an entry there is corrected the kill feed is corrected with it.
Three things follow from that shape. **Utility needs no rule of its own** — `killWeaponName` is
`weaponName` of the bridged entry, so #152's deference to `UTILITY_NAMES` happens once and a kill by
`inferno`, `molotov` or `incgrenade` all read `Molotov`. **This is not #53**: it is a lookup between
two vocabularies that both still exist, not a canonical enumeration replacing them, and the name it
answers with is still upstream's. And **an unbridged weapon names itself** — upstream's identifier
in a sentence is the defect being closed, but a name nobody can say beats a row that says nothing,
and it is the fallback `killWeaponClass` already makes. The test that keeps the two enumerations
honest walks `WEAPON_ICON_IDS`: every id the product draws must resolve to a name that is not the id
and to the same class the icon route gives it. Measured on the fixture over 424 feed rows in each
locale — **19 identifiers before, the same 19 as names after, 0 identifiers left in either**.

**#134 made the shared controls name what they transition, and the surprise is that naming it made
the interface faster.** `Button` was shadcn's `transition-all` at Tailwind's own 150 ms and
`cubic-bezier(0.4, 0, 0.2, 1)` — neither number the product's — and `transition-all` is a loaded gun
rather than a live defect: it animates whatever happens to change, so a variant that adjusts padding
or a width tweens layout silently and nothing catches it. Measured on `main` it already animated
eight properties on focus, `outline-width` and `outline-offset` among them, which nothing in
`DESIGN.md` asked for. The three controls in `packages/ui` now list their properties and take
`--duration-micro` on `--ease-out`, and the two figures to keep are the response ones: hover on the
accent button reaches 90% of its change in **49 ms against 100 ms** and 99% in **93 ms against
133 ms**, three passes an arm, one headed Chrome at 1440×900 in one hour. **The old numbers were
outside §1's 120 ms and the new ones are not**, which is the whole argument for `--ease-out` in
`DESIGN.md` §8 arriving as evidence: a *shorter* nominal duration on a strong decelerating
curve is half done at 17 ms where Tailwind's is half done at 58 ms. Two smaller things ride with it.
The `Switch` knob transitioned `transform` while `peer-checked:` also changed its colour, so the
colour snapped at the start of a 140 ms slide; it names both properties now. And **`DESIGN.md`
§8's token block said `--motion-*` where the token layer has said `--duration-*` since #132** — five
readings of a name nothing in the product answers to.

**#223 made an invalid Tailwind class fail the build, and the shape is two questions rather than a
list.** `bun run tokens:check` asks the sources what they write into a class position and asks the
emitted stylesheet what it has a rule for; anything in the first and not the second is reported with
every file and line that writes it. That is the only way to catch this family — an invalid candidate
is **dropped in silence**: no build error, no lint error, no runtime warning, and the class reads as
correct in review, which is how `text-15` shipped the settings label at its own note's size from
#203 to #210. Five things are load-bearing. **The scan is anchored, not swept** — `className`,
`class` and `cva` — because Tailwind's candidate grammar accepts a bare English word, so a sweep
over the tree reports prose; a token is then only asked about if it carries `-`, `:`, `[`, `(` or
`/`, which is what every step on a scale carries and what `flex` does not. **A template is walked
rather than dropped**: `${selected ? 'bg-hover' : ''}` holds two class lists, and removing
interpolations wholesale would blind the check to the half of this codebase that writes a class
conditionally. **A `cva` variant name is not a class list** — `icon-lg` is both a size and a shape,
and it appears as a key and again as a value under `defaultVariants` — so a name the same call uses
as a key is skipped, which is a rule rather than an exception list. **Class names are read out of
the CSS rather than matched against it**, because a class carries its own escapes and unescaping
once is one rule where building the escaped selector per candidate is a rule per punctuation mark;
the trap there is that `.glass-panel.has-brow` defines *both* halves, so only a **digit** before the
dot means a decimal point. And **it runs after `build` in `ci.yml`**, since it has nothing to read
until Tailwind has run — which also means a stale `dist` makes it lie, and the failure message says
so. The `var(--…)` half is the same script and covers the stylesheets too, where 63 of the 63
references live. On `main` at the commit that closed #134: **372 classes and 63 custom properties, 0
unresolved**.

**#144, #65 and #139 are one family in three scripts: the artifact you measure is not always the
artifact that shipped.** The smoke test now takes every hashed path from the **deployed page** —
`index.html` names the entry chunk, the chunk names the parse worker, the worker names the binary,
and the stylesheet names the fonts, which is the only walk that reaches a `.wasm` whose name appears
nowhere in the document. Five things are load-bearing. **A local asset name and a deployed one can
never agree**, so this was never a staleness a rebuild could fix: a macOS `wasm-pack` build and the
Linux one `deploy.yml` ships are the same size from the same source under the same pinned 0.15.0 and
are not the same bytes. **The script needs no build at all now** — the radar images are read from
`packages/map-data/assets/radar`, where they are committed and unhashed, which is what makes a local
listing honest for them and for nothing else. **One request per asset**, so the caching and
content-type assertions can no longer disagree about one URL: on `main` `immutable .wasm` *passed*
on a shell that `wasm content-type` then failed, because `_headers` grants `immutable` by path and
was answering for a file that was not being served. **The propagation wait has one deadline for all
four assets**, not one each — the lag is a single event at the edge, and four private two-minute
budgets would spend eight. And **`bun run size` weighs the binary in `dist` and refuses to weigh
anything when that is not the one `pkg/` holds**, because `rm -rf apps/web/dist && bun run build`
restores turbo's cached dist without running Vite, which is why the failure asks for
`bun run build --force`. Measured against production the same hour: `main` reported
`fail wasm content-type … BG3eib1d.wasm → 200, text/html` where the branch reads
`ok … LtgUjUur.wasm → 200, application/wasm` — the binary production actually serves. Twelve
assertions rather than thirteen; the one that went is `immutable .map`, and a source map is not part
of §13.

**#277 redressed the way in, and the biggest thing in it is that `Dialog` and `Sheet` are no longer
a native `<dialog>`.** Both are Base UI's dialog through animate-ui's primitive now, which supersedes
what #203 and #235 recorded above. The argument that put them on the platform was a good one — the
top layer, the focus trap, the `Esc` close request and `closedby="any"` light dismiss are all the
platform's — and it loses to the one thing the platform will not do: **let a dialog leave.**
`close()` is immediate, so an exit animation off a native `<dialog>` means holding the element open
on a timer and racing its own state. Everything the native version was kept for, Base UI also does,
and it was measured rather than assumed: focus trapped inside and **restored to the control that
opened it** (`Esc` on the settings sheet returns focus to the settings button), page scroll locked,
`Esc` and an outside press both closing, and the exit actually running — a popup caught at opacity
**0.32** a frame after the press, and gone after it. Six things ride with that.

**The scrims stopped being `::backdrop`.** `.surface-sheet` and `.dialog-scrim` are element classes
now, which is what lets the scrim fade rather than appear, and is the whole reason for the move.
**`DemoDialog` is mounted whether or not it is open** — an exit animation belongs to an element that
still exists — and it holds the last demo it was given across the exit so the card fades out with its
content; the parse is still released the moment `saved` goes, verified as 0 canvases left behind.
**The registry's popup arrives with a `filter: blur(4px)` and a 20° `rotateX`**, and both are
overridden from the call site rather than edited upstream, because the primitive spreads the caller's
props over its defaults. A blur animation over a full-viewport surface is what §17 rule 1 exists to
refuse.

**The rail is a column against the app's own ground with one hairline**, not a card: 280px with a
right edge at 1440, a full-width row with a bottom edge at 1024, and the current entry is
animate-ui's `Highlight` in `children` mode — one `layoutId` shared by every seat, so `motion` moves
the same pill between them on `transform` alone. Two things there are load-bearing. **The effect
writes `aria-selected` onto whatever it wraps**, and a `listitem` may not carry it, so the
`HighlightItem` passes it `undefined` — props are spread after the effect's own attributes, which is
what makes the override possible without an edit. And **`RailEntry` is `relative`**: the pill is an
absolutely positioned sibling at `z-index: 0`, and a static button's own text paints *below* a
positioned sibling however late it comes in the DOM.

**`ParseProgress` has a bar again**, which #236 removed as a second statement of the same fact — the
reversal is #277's own decision, and the reason is that a percentage says how far and a bar says how
far *of the whole*. It is Base UI's `progressbar` with `aria-valuenow` and an `Intl`-formatted
`aria-valuetext`, named by a `ProgressLabel` rather than an asserted `aria-label`, with animate-ui's
`CountingNumber` counting the digits underneath at `aria-hidden`. **The fill scales, it does not
resize** — `transform: scaleX()` — which is why the barrel exports `Progress` from the *primitive*
layer: the registry's styled track renders an indicator that animates `width`. And **the per-cent
sign moved into the message catalogue**, `42%` against `42 %`, because `CountingNumber` writes
`textContent` and cannot carry a suffix, and that space is what `Intl` produces for `ru`.

Measured at 1440×900 and 1024×800 with `innerWidth`/`innerHeight` asserted inside the run, in `en`
and in `ru`: **0 elements overflowing** on every screen at every width, over
`document.querySelectorAll('*')` with each hit's ancestors walked for `overflow`; **0
`backdrop-filter`s and 0 `.glass-*` classes** anywhere on the way in; the library grid at **4 columns
of 261px at 1440 and 3 of 317px at 1024**, so the `auto-fill` floor still refuses two stretched
columns. The bundle is the one budget this moved: **195.08 → 218.87 kB gz, 39.0% → 43.8%** of the
500 kB, and it is Base UI's dialog, progress and highlight rather than `motion` — the lazy
`motion-features` chunk was already 0.16 kB on `main`, so that split point had collapsed before this
branch.


**#278 redressed the stage, and the change with the most in it is that a player row stopped being a
list.** The row was three stacked lines with the third conditional on holding utility, so a card had
two row heights and the two sides measured 278px and 321.5px for the same five seats; it is two
fixed lines now, and every row is the same height in both cards and both locales — 48.25px at
1440×900, 66.25px below the split. Five things are load-bearing.

**Health is the row's own ground rather than a rule across it.** There were two full-width bars per
row — twenty saturated rules across the stage, all of them at 100% for the whole buy phase — and
§17 rule 5 says colour is data, which a constant is not. As a wash scaled with `transform: scaleX()`
the same number is readable across all five rows at once, so a card answers *how much of this side
is left* without being read row by row, and a dead player is an empty row rather than a word alone.
It carries no transition: this is written ten times a second and a tween on it would be motion on
the reading channel. **Armour spent one build as a 16px track beside the health figure and read as
an em-dash** — `100 —` — then one build as a 1px rule along the row's bottom edge, which the owner
read as a stray white line under the health. It is `sr-only` now and the helmet pip is the only
armour mark left on screen.

**Selecting a row does not resize anything, and that is the owner's call over the issue's own
acceptance criterion.** #278 asked for animate-ui's `AutoHeight` so the round grows into place; it
was built, measured and then removed, because the reading of it on a real match was that the card
jumps. The round's four numbers are drawn under the selected player's **own name on the plate**
instead — `LabelSubject.detail`, one line of the mono face a rank under the name, through the same
halo — which is where the reader is already looking. Two consequences. **`labelPlacer.place` takes a
per-label height now**, so the taller label keeps its neighbours clear of the round underneath and
not of the name alone; the placer already stored a per-entry height, so what was added is the
*candidate* being allowed to differ. And **the string is built in `RadarView` and never in the
draw**: a canvas cannot reach the message catalogue, and its width is measured on the frame it
changes and cached after it, because `measureText` returns a `TextMetrics` and this runs inside a
draw. There is a test that three frames of one round cost one measurement.

**The plate stopped moving when a player is selected.** Below the split the strip and the plate are
two rows of one grid, so anything the strip grew the plate lost: measured on the fixture at
1024×800, selecting one player took the plate from **459 to 376**. It is **473 in every state**
now, and 716 at 1440×900 either way — above the split the plate's cell spans the rows the card
steals from, so its size was never affected there. A reserved footer was built first, at the owner's
direction, and deleted when the expand went; the row keeping one height is what actually fixes it.
**A 1.25px version of the same bug outlived the first fix** — `DEAD` is `.label-dense` at 11px
against 12px type and 12px glyphs, so a row measured 64.25px alive and 63px dead, which is a plate
that grows under the reader as a side is wiped out. The state line is a fixed 16px for that reason.

**#218's wrap was reintroduced and then re-fixed, and the sweep is why it was nearly missed.** A
seat below the split is 93.2px of content box and the money figure runs **15.7px past it in `en` and
23px in `ru`** — but the row has `overflow-hidden`, so #199's viewport sweep reports **0 overflowing
elements** with the figure clipped in silence. The probe that catches it measures every child
against its *seat's* padding box, and it has to skip absolutely positioned marks or the health wash
and the side rule report as overflow on every row by design. Money takes a line of its own below the
split **by rule rather than by fit**, or a dead row carrying two short words would not wrap where the
live row beside it did.

**`SlidingNumber` is kept, and it was checked rather than assumed.** Money and the score roll; the
round clock deliberately does not, because it is a 10 Hz readout. It writes digits and nothing else,
so `moneyShape` takes the locale's prefix, suffix and group separator off `Intl.formatToParts` once
per locale and the digits sit between them — `$4,200` and `4 200 $` both stay correct. The roller is
`aria-hidden` and a plain `sr-only` figure is what is read, because ten absolutely-positioned copies
of every place is not a number to a screen reader; the same reasoning made the scoreboard's own
score one `sr-only` reading with everything under it hidden. **The cost is DOM rather than frames**:
the review screen goes 1,143 → 1,654 elements, 451 of them the roller's, and §16's two rows measured
0 over 16.7 ms across three passes each with `main` indistinguishable beside it.

**Armour is Valve's own icon, and the set it came from grew a second half.** A hand-drawn helmet pip
stated *helmet* and nothing about the vest; `apps/web/assets/equipment-icons/` now holds
`armor.svg` and `armor_helmet.svg` from the same `Juknum/counter-strike-icons` extraction the weapon
outlines came from, so the row draws the vest alone or the vest with the helmet beside it — the two
states Counter-Strike itself has, and a helmet without a vest is not one of them. Four things to
know. **The ids live in `core/glyphs` rather than in `demo-core`**, because armour is not in any demo
vocabulary — a weapon icon's id *is* one, which is what lets `WEAPON_ICON_IDS` hold that table to its
word, while armour is `TickTrack.armour` and the `FLAG_HELMET` bit read together and so belongs to
the interface that draws it (hard rule 11). **`icons:generate` builds both tables now** and the
script is `tools/scripts/icons-generate.ts`; its "exactly one path" rule became "one or more, joined
as subpaths", because Valve draws the vest and the helmet as two siblings in one 48.75-wide box — the
old rule would have rejected that asset, and what it did instead on a two-path asset was take the
first and silently lose the rest. **The weapon table is byte-identical across that change**, which is
what says the join is safe for the set that already shipped. And **the glyph takes its ink as a
prop rather than through a wrapper**: a wrapper is an element whether or not the glyph draws, and an
empty one still takes a share of its parent's `gap` — measured on the fixture's pistol round, the
three players with no vest each carried 6px of space where the mark would have been. The value is
not lost with the bar: the row states `armour` and, when it applies, `helmet` as `sr-only` text.

The four full-length stat keys survive the expand's deletion because the row still carries them
`sr-only` — moving the round to a canvas would otherwise have made a selected player's numbers
unavailable to a screen reader, which is the one direction this screen may not move in. Three
abbreviations were added for the plate (`K`/`D`/`DMG`, `У`/`С`/`УР`). The scoreboard, the feed, the
corner cluster and `MatchIdentity` keep their behaviour; the feed's arrival and §8's assembly read
`DURATION_MICRO_SECONDS` and `DURATION_PANEL_SECONDS` from the token layer rather than restating
0.14 and 0.34.

**#286 put Valve's own vocabulary on the plate, and what moved is the box rather than the art.**
Six hand-drawn utility marks said *a grenade of some kind* where a reader looking at a buy is asking
*which*, and the mark beside a name on the plate said *a rifle* where they are asking *which rifle*.
All of it is Valve's now, from the `Juknum/counter-strike-icons` extraction the weapon outlines and
the armour came from. Six things are load-bearing. **#164's finding is revised rather than
ignored**: that PR measured a model outline in a 14×7 box as a smudge and drew class silhouettes for
that reason, and the box is what was wrong — 24×10 draws an AK-47, an M4A1-S and a knife as three
shapes, and it costs the label's lead **17px → 27px** against a name of sixty to eighty. **The icon
is fitted inside that box and right-aligned against the name**, so the slack a narrow object leaves
falls on the outer edge where the map is rather than between the mark and the word it leads, the
2px halo closes a 3px gap into one shape where it could not close fourteen, and the name starts at
the same offset whatever is in the box — which is what §6.1 means by a name that never twitches.
`GRENADE_SILHOUETTE` is deleted with the last reader of it, and the class silhouettes stay as the
fallback for a weapon nobody here has drawn. **A grenade in the air is drawn at the head of its own
trajectory**, in the utility's colour, obeying §10.5's trajectories row along with the line under it
— the two are one drawing of one thing — and its position is the last sample the clip reaches, so it
is a function of `clock.frame` and #175 still holds: `detonationTick === null` means the ending is
unknown, never that the grenade is still flying. **A mark set belongs to one box**, and
`equipment-marks.ts` (`weapon-marks.ts` until this) holds three tables rather than one map, because
the *names* collide — `knife` is a model in Valve's vocabulary and a class in this product's, and
they are two different drawings. Each is compiled to a `Path2D` at its own box's scale the first
time anybody holds that thing, which is the bargain #164 struck and the reason a second size is a
second compilation rather than a transform at draw time. **Valve's outlines fill even-odd and the
silhouettes fill non-zero**: a trigger guard is a hole in the first and the second is overlapping
parts of one object, so one rule for both punches the knife inside out. And **`flashbang.svg` is
upstream's `flashbang_assist` turned upright** — the only place Valve's art is altered in this
repository, declared as data in `ROTATIONS`, rotated about the centre and re-boxed afterwards, with
five tests and the reasoning in `apps/web/assets/equipment-icons/README.md`. Two numbers: the plate
is **716 at 1440×900 with a player selected, unchanged**, and the bundle is 222.16 → 223.44 kB gz,
of which 0.96 kB is the six utility outlines as polygon data and 0.32 kB is everything else — the
weapon table has shipped since #260 for a team row, and this only gave the plate a reader for it.

**#282 set a plate name at the size the product reads it at, and the finding is in the placer
rather than in the type.** A nickname beside a token was 10px against the 13 the same nickname is
set at in a team row, and the owner could not tell one player from another at 100% zoom without
leaning in. The name is §3's 13 now, the mark box is 24×10 → **31×13** — the invariant being that
the mark is exactly as tall as the name it leads, so the two stay one label — and the round under a
selected name is 9 → 12, one rank down the same scale. Five things are load-bearing. **The old issue
body was wrong about what a wider label costs**: `labelPlacer` never drops a label, it tries four
candidate boxes and falls back to the first one, so the cost is *overlap* and every named living
player is always drawn. **The metric is how much of a label is covered**, not whether two boxes
touch: a kiss at the edge is not an illegible name, and counting any contact reported 50% where a
quarter-covered box reported 27%. **The placer had the real defect, and it predates this branch** —
a buy phase is five players on one spawn point, where every cardinal box overlaps a neighbour's, and
at four positions a buy phase buried **40% of its labels at 1440×900 and 70% at 1024×800** under
more than a quarter of their own area, with the *small* type. Twelve positions — the cardinal four
first so a label that could be placed still goes where it went, then the four corners, then a second
and third row above and below — take that to **0% in every one of eight windows**, two rounds × a
buy phase and a mid-round × both viewports × a player selected and not. **The halo stays 2px** by
decision: it holds a glyph off a bright plate pixel rather than being a proportion of the type, and
a 4px stroke under 13px text leaves the counters further open than it did under 10px. And **§3's
optical tracking is still not applied on this canvas**, which is now recorded rather than left to be
rediscovered: the step asks 0.005em here, 0.9px across the longest name this draws, where at 10px
the same rule asked four times as much. §16's two rows are unmoved against an `aad966e` baseline and
the bundle is 223.44 → 223.50 kB.

**#279 redressed the bottom of the screen, and the thing that cost the most to find is a
vendored one-liner.** The round strip is a toggle group with the highlight effect carrying the round
being played, the survivor tracks are drawn inside the pill, a crowded axis glyph collapses on its
own, and the speed control is a toggle group that is still a `fieldset`. Six things are
load-bearing.

**A motion component never receives Base UI's composite ref**, and animate-ui's toggle item is a
`motion.button`. Base UI's toggle group walks its items by calling `.focus()` on the node it was
handed, so with an empty list an arrow key moved the group's *tab stop* and left the focus where it
was — and the group calls `stopPropagation` on the keys it takes, so the press did not fall through
to §9.1's seek either. It did nothing at all. Measured three ways over CDP: with upstream's element
the tab stop went 4 → 5 while `document.activeElement` did not move and
`HTMLElement.prototype.focus` was never called; through Base UI's render-*function* form, passing
the ref explicitly, identically; with a plain `<button>` the focus walks the group. That is
`UPSTREAM.md`'s third deviation, and it takes upstream's `whileTap` scale with it — which costs this
product nothing, because interaction here is luminance rather than movement. **The arrival fade
moved to the seat** for the same reason: a plain button takes no motion props.

**The block is one height in every state.** Asking for the survivors used to take the strip from
28px to 44 and the block from 92 to 108 — and the plate is measured from that row, so a preference
about what a pill *says* took 16px off the map for as long as it was on: `main` measures **700 at
1440×900 with the tracks showing and 716 without**, where the branch is **716 in both**, 473 in both
at 1024×800, and 124 with the scoreboard brow against 92 without it. The tracks are 3px rows inside
the pill now, above the winner bar rather than under the number.

**#271 closes on a local collapse, and the average threshold is deleted rather than tuned.** A glyph
draws its symbol when the nearest mark is at least one glyph's width away and falls back to a tick
when it is not — `hasRoomForSymbol` off the same hit slot #268 tiled the axis with, so **the
instrument that decides the press decides the form**. Over 751 glyphs in 30 rounds on the fixture,
which is #271's own count: `main` draws **711 symbols with 29 of the 30 rounds overlapping**, and
the one round it does collapse is the densest — the axis-wide average took all 40 of that round's
shapes at once, which is precisely the instrument being wrong rather than mistuned. The branch draws
**98 symbols, 0 rounds with two symbols closer than 24px**, and that densest round keeps 3. A
collapsed glyph keeps its position and its hue and loses only its shape; nothing is nudged, because
a mark moved off its own moment is a lie about time on a time axis. 47 presses still land on a
neighbour and they are the sub-pixel pairs #268 measured and explained.

**The winner bar stays on the pill that is playing.** It used to drop for a fill, which was how a
strip with no other mark for *here* said it; the highlight says it now, and a bar that vanished
under it would blink out of one pill and into another every time the round turned over. The lit
pill's fill is `--color-selected` on a shared `layoutId`, so it slides between seats on `transform`.

**The brow is a border**, not three inset shadows standing in for one, and `.surface-brow` is that
one line. Two smaller things: `aria-selected` is dropped from the seat the effect writes it onto — a
generic element may not carry it and the reading is the button's own `aria-pressed` — and the
segment break's dashed rule is the seat's `::before`, because the highlight takes exactly one child
and a wrapper is what would have been handed that attribute.

The bundle is **223.50 → 229.21 kB gz**, all of it Base UI's toggle group and composite. `AGENTS.md`
§16's two frame rows are unmoved against a `1e749fd` baseline taken the same hour.


**#280 closed the redesign, and the two defects it found are both a transition naming a property its
own element never sets.** The settings table is five sections the reader can close rather than
thirteen rows of equal weight, a choice row is the round strip's toggle group at another size, and
the help legend's seventeen marks stand on the plate's own ground. Six things are load-bearing.

**The accordion comes from the primitive layer, and the second reason is a rule.** The registry's
styled trigger is `transition-all` at Tailwind's own `duration-200` — the loaded gun #134 took off
the shared controls — and the primitive's panel animates `height` from 0 to `auto`, which the hard rule 9
of that day forbade at *every* moment rather than during playback. The panel spreads the caller's props over its
defaults, so `SettingGroup` names its own `initial`/`animate`/`exit` and replaces the height tween
instead of adding to it: opening fades over `--duration-micro`, **closing is instant**, and the height
change is a change rather than an animation in both directions. Closing carries no fade because an
exit is what blocks the unmount — fading a panel out and *then* collapsing it moves every row beneath
it after the reader has stopped looking at the thing that moved.

**`transition-[transform, …]` is a working animation to every check that samples the two ends**, and
two of them shipped. Tailwind v4's `translate-x-4` and `scale-110` write the **individual** `translate`
and `scale` properties, so an arbitrary list naming `transform` transitions a property the element
never sets — the `transition-transform` *utility* is fine, because it expands to all four names, and
only a hand-written list can miss. `Switch`'s knob jumped while its colour tweened and `DemoCard`'s
thumbnail jumped while its opacity did. Measured per frame at 120 Hz, both directions: **16
intermediate frames on the branch against 0 on `main`** for the knob, **24 against 0** for the
thumbnail. That is the whole of the motion pass's defect list — every other transition in the product
already named its properties, took `--duration-*` and `--ease-out`, and no reachable file lists `all`
(the registry's styled components do, and none of them is imported).

**`--duration-instant` is deleted.** 90ms, carried over from the system the redesign replaced, and
read by nothing in any screen it built; a fourth step nobody can choose correctly is worse than three.
`--ease-in` and `--ease-spring` stay unspent on purpose — `@theme static` exists so a token can
precede its first caller — but a duration the *old* system chose is what this issue asked to be
re-chosen or dropped.

**The contrast table is finished rather than started.** `packages/ui/src/styles/tokens.css` already
carried the twelve ink pairings and the interaction composites; #280 added the nine data colours on
`--color-surface-0` **and** `--color-surface-1`, in the default palette and again under
`:root[data-palette="colour-blind"]`. Thirty-six pairings, floor **5.03** (`--color-objective` on a
card), and every figure already in the file reproduced to the last decimal — the script is still the
comment on #133 and still not committed, which is what **#123 is restated around** rather than closed:
its old body was written against `docs/DESIGN.md` §2/§12 and against glass over the plate, and the
radar images stopped being an input to it the day no text was set over them.

**A legend swatch stands on `--color-surface-0` now**, in a hairline tile, and that is not decoration:
a mark's halo and the hollow in a walking token are both drawn in that colour, so a specimen floating
on a sheet — 72% of it over a blurred screen — draws its own background as a dark shape. On the ground
it was drawn for, a halo disappears the way it does on the plate.

**The reduced-motion contract was measured rather than assumed**, in all six combinations of the
device's `prefers-reduced-motion` and the sheet's three answers: `data-motion-reduce` reads
`null`/`on`/`off`, the reset takes a 220 ms transition to `1e-05s` and forces `transition-property` to
`opacity`, and **`Full` overrides a device asking for reduced** as well as the other way round. Two
numbers: the bundle is **229.21 → 232.95 kB gz, 46.6%**, all 3.74 kB of it Base UI's accordion, and
§16's two frame rows are unmoved against a `9d95208` baseline taken the same hour — 0 frames over
16.7 ms in all twelve passes across both arms, with the plate at 716 either way.


**#295 turned the round clock around, and the thing worth keeping is that the reason it counted up
was a misreading rather than a limit.** `roundClockAtFrame` refused the countdown in its own doc
comment, and the refusal was well argued: a countdown needs the round's length, and `docs/PARSER.md`
§13 says no `mp_roundtime` reaches a demo any more than a tick rate or a bombsite name does.
Measured, that premise is false in two directions at once. Six things are load-bearing.

**The convars are in the demo and `DemoOutput.convars` is dead** — upstream initialises that map at
three places and writes it at none, pushing each `net_SetConVar` into `game_events` as a
`server_cvar` instead, and only when `wanted_events` names it. So a reader looking at the field
named after the thing they want finds an empty map and concludes the recording does not carry it.
72 variables arrive that way, and two traps are visible in them: **`mp_roundtime_defuse` is set
twice**, `2` at tick −1 and `1.92` at tick 4,296 where the match configuration lands, so taking the
first occurrence reads 120 s for a match that ran 115; and *which* of the three `mp_roundtime*`
applies depends on the map type, which is a rule about Counter-Strike rather than about this demo.

**So the convar is not what is read.** `CCSGameRules.m_iRoundTime` is the engine's own answer in
whole seconds — 115 across this whole match — and it arrives through `wanted_other_props`, a channel
every pass here passed `vec![]` on until now. It is stored **per round**, read at freeze-time end,
because a config change between halves or into overtime moves it and one figure for the match would
then be wrong for half of them. It is deliberately **not** in `TICK_PROPS`, which `Ticks::of`
requires column by column: a demo without it parses and gets `roundTimeSeconds: null`, and that
round's clock counts up the way every round did before this.

**§13's cross-check of the tick rate was circular and there is an honest one now.** That section
derives 64 from "7,360 ticks over a 115-second round", where the 115 was the assumption being
checked. `mp_freezetime = 20` against a measured 1,280-tick buy phase reads 64.0 without assuming
its own answer. The constant is unchanged; what it now has is a second, independent measurement.

**The bomb has no convar and one event.** `mp_c4timer` is not broadcast at all, and `bomb_exploded`
had only ever been seen here as a `round_end` reason string. Its three occurrences sit **exactly
2,624 ticks — 41.00 s — after their own plant**, three of three with no spread, so `BombPlant`
carries a `detonationTick` and the interval is the measurement. **The join is by time and never by
the round**: one of the three lands 29 ticks *after* its own `round_end`, because the last CT died
while the bomb was ticking, and a join through the round would have dropped it. A match in which no
bomb ever exploded falls back to **40 s** — the owner's decision, taken over the objection that it
is the same quiet assumption 1:55 would have been, and recorded rather than argued in the code.

**`RoundPhase` gained `bomb`, and the scoreboard is all that reads it.** Freeze counts down as it
did; live counts down from the round's own length; the bomb phase replaces the round's clock the
moment the bomb goes down, the way the game's HUD does, and takes `--color-objective` with a
different accessible name — the colour is not the only carrier. **`post` holds whatever the clock
read as the round ended**, so a defuse with three seconds left reads `0:03`, and it stays `post`
rather than becoming a fifth state: what the number means is already said by the round strip and
the feed. Two numbers from the built bundle at 1440×900: the clock's box is **58.5px in every phase
and both locales**, so the row cannot move, and the whole match walks 1:55 → 0:00 with **0 readings
below zero and 0 above 2:10** over 6,000 samples.

**Two moves came with it and neither is tidying.** `lastIndexAtOrBefore` went from `player-state`
to `selectors` because the clock needed it and `player-state` already imports `selectors`, so
leaving it where it was would have closed the cycle. And `selectors.ts` crossed 300 lines on this
branch — 226 → 332 — so the clock is `helpers/round-clock.ts` at 126 and `selectors.ts` is back at
207; the seam is the one the change itself made visible, since everything left in `selectors` is
*where in the track am I* and nothing else in it asks the clock anything. `SCHEMA_VERSION` is **7** and every cached demo is a miss once; the native parse
is 16.81/16.54/16.55 s before against 15.41/15.31/16.31 s after, which is one spread rather than two.
`docs/PARSER.md` §21 carries the convar table, the two traps and the bomb's numbers.


**#214 gave a kill's marks a reading a pointer is not needed for, and #284 deleted a split point
that had never split anything.** Both are on the same branch and neither is about the other.

**#214.** §5.4's feed named a kill *with the weapon and the three marks* — headshot, wallbang,
through smoke — and §7.1's axis glyph named the same kill with neither. Below
`--breakpoint-split` the feed **is not drawn at all**, so at those widths the weapon and the marks
existed on a hover tooltip and nowhere else: not on the keyboard, not to a screen reader, not to
anyone who pressed the glyph. The owner's answer was the one that adds the reading rather than the
one that documents its absence. Four things are load-bearing. **`killName` lives in `core/events`**,
which is where `EventRow` already lives for the same reason — two features draw one kill, and
`timeline` may not import from `review`. **The strings moved to an `events` namespace**, which is
new and is the eleventh: `events.kill.*`, `events.plant` and `events.defuse.*` are the row's whole
vocabulary, and a sentence two surfaces say belongs to the slice they both import rather than to
whichever of them was written first. That took the repeated-string count between the feed and the
axis from four to **one** — `unknownPlayer`, which `row.ts` keeps per-namespace by decision.
**`defuseOutcomeKey` moved with its strings** and `roundOutcomeKey` did not; the second names
`timeline.outcome.*`, which no other feature says. And **a mark is its own sentence** —
`[sentence, ...marks].join('. ')`, the shape the feed already had — because a message naming all
three would need eight forms of itself in each locale. The tooltip's own comment claimed it merely
restated the glyph's accessible name, and that claim is true now rather than nearly true: a tooltip
may shorten a route, it may not *be* one.

**#284.** `LazyMotion`'s split point was a **157-byte** chunk — `var r={renderer:t,...e,...n}`, a
re-export of three symbols the entry chunk already held — and `provider.tsx` carried a doc comment
saying the opposite, which is the part that cost something: the next reader reaches for `m` over
`motion` believing it buys a deferred download. It cannot be made real, and that is the finding
rather than a preference: every animate-ui primitive imports `motion` directly, so the feature set
is in the entry chunk whatever the provider does, and the only way to defer it is to stop importing
the registry. So `LazyMotion`, `motion-features.ts` and **`m` itself** are gone — `m` most of all,
because an `m.div` with no `LazyMotion` above it renders and quietly never moves, which is a defect
no type can catch. Four call sites became `motion.*`. The bundle went **233.14 → 232.74 kB gz**,
entry chunk 217.96 → 217.74, and the chunk count dropped by one.

**#275 took the property list out of hard rule 9, and #73 brought the README up to the product it
describes.** The rule read "`transform` and `opacity` only, at every moment", and **the product had
already outvoted it**: interaction here is expressed in luminance (§17 rule 5), which is a colour
change, so the shipped `Button`, `Input` and `Switch` were all in breach on the day #134 named their
property lists — and #134's own issue body was written from the strict reading, for a control whose
only hover feedback is a background colour. The owner's call was to drop the prohibition rather than
carve exceptions into it: **rule 9 is the 60 fps budget and nothing else**, measured by `AGENTS.md`
§16 with everything on, and when it fails the motion is what goes. Three things to know. **The
architectural half moved rather than went** — nothing subscribed to the frame channel may touch
React, which is hard rule 4's business and is enforced by the channel split, not by CSS; and what
changes on a *canvas* is still a function of `clock.frame`, which is a statement about which clock
is read rather than about which property is written. **Nothing in the product changed shape**: eight
code comments cited the rule as a prohibition, every one of them for a decision that is still right
— `scaleX` over `width` on the progress bar and the health wash, `translate` over `top` on the
timeline block, a fade over a `height` tween on the settings accordion — so each now states the cost
it avoids instead of the rule it obeyed. **A property that triggers layout is a review note now, not
a rule**, and §16 is what settles an argument about one. The README, meanwhile, had been telling
readers since Phase 1 that nothing was deployed; it links the live app, states the phase, and
**quotes no measurement at all** — every number it used to carry was wrong by then, so the sections
that would carry one link `AGENTS.md` §16 and `docs/PARSER.md` instead. Two of #73's own bullets
were stale in the other direction and are worth knowing about as a habit: `tools/probes/` is in the
tree, and `packages/demo-store` is no longer "arriving in a later phase".

**#301 and #60 gave the two rules this repository states about merging something that enforces
them.** `gh pr merge --auto` had been a silent no-op for the life of the project — `main` carried no
protection at all, so there were no *required* checks to wait for, and #298 merged forty seconds
after it opened with `ci` and `wasm` both still running. Three things are load-bearing. **A workflow
a path filter skips never creates its check run**, so marking `ci` and `wasm` required on top of
today's filters would have left every pull request pending for ever in one direction or the other —
a frontend one waiting on `wasm`, a parser-only one waiting on `ci`. A *job* skipped by an `if`
reports success, so the filter moved off the `pull_request` trigger and into a `scope` job that asks
the pull request for its own file list; `push` keeps its filter, and the two are one list in two
grammars. **The check is not a fake green**: no second workflow reports a context it did not earn,
which is the documented alternative and cannot be made unambiguous here — a pull request touching
both arms would trigger the real workflow and its stand-in at once. And **`bun run bitfields:check`
is `errors:check`'s shape for the other contract copied by hand**: `FLAG_*` and `GRENADE_*` are
written in Rust and read in TypeScript, both files said "must stay in sync with" the other, and
nothing enforced it — a bit that means *scoped* on one side and *defusing* on the other draws a
plate that is wrong rather than broken. It compares name **and** shift, in order, and it runs in
both workflows for the reason `errors:check` does. `SCHEMA_VERSION` is deliberately not checked: the
crate owns no copy of it, and that is written in the script rather than left implicit.


**#292 and #294 took `aria-selected` off everything a role does not allow it on, and the two halves
needed two different answers.** animate-ui's highlight spreads one `dataAttributes` set — which
carries `aria-selected` — over three elements: the seat, the child it clones, and the `motion.div`
that draws the pill. The seat and the child are answerable from the call site and were already
answered; the pill is inside the vendored file and is not, so it is `UPSTREAM.md`'s **fourth marked
deviation** and the spread is gone from it. Three things are load-bearing. **The whole set went
rather than `aria-hidden` going on beside it** — the attributes identify the *item* and the pill is
the fill behind one, nothing here or upstream reads the `data-*` half off that element, and the one
`querySelector` for `[data-value][data-highlight="true"]` runs in `parent` mode where the pill never
had them; an added `aria-hidden` would also have left the sweep reporting it. **`SettingChoice` is
`RoundPill`'s answer at the other call site**: `ChoiceButton` takes `index` and `label` by name, so
the clone's props land on a component that spreads nothing and die there — which is also what gives
those eighteen buttons back their own `data-slot="toggle"`, and why the button carries `relative`
itself, the clone having been what stood it above the pill. And **the seat's own `relative` went
with it**, because the pill is positioned against the highlight's item container and never against
that span. Measured over `document.querySelectorAll('*')` at 1440×900 in `en` and in `ru`: the way
in **1 → 0**, the review screen **1 → 0**, and the settings sheet with all five groups open
**26 → 0** — 18 buttons and 8 pills before, none of either after — with `aria-pressed` still one per
group, the arrow keys still walking each group, and the strip's pill still sliding on `transform`
(571px → 1094px across eight sampled frames of translation). Neither `Enter` nor `Space` activates a
focused option in the Browser pane, on this branch **and on `main`**, and the same keys do nothing
on a plain close button there either: it is the pane's key injection, not the product.

`packages/demo-store` exists since #51 and closes Phase 2's storage half: a demo parsed once is read
back in **0.02 s** instead of 18.6 s, from OPFS or from IndexedDB when OPFS is missing, chosen by
feature detection. Two things there are deliberate and easy to "fix" into bugs — **the cache key
digests only the ends of the file, not all of it**, and **a missing tier or an unreadable container
is a miss rather than an error**. Both are argued in `AGENTS.md` §6.4, which is also where the
eviction policy and the `storage.persist()` answer live. Every package `AGENTS.md` §4 names now
exists.

**#75 put both tiers of that store under the suite, and the answer is two different means for two
different risks.** IndexedDB runs against **`fake-indexeddb`** — a dev dependency the owner approved
on 4 September 2026, 676 kB with no transitive dependencies and no reader outside one test file —
because what breaks silently there is the platform's semantics rather than ours: the promise
wrappers around `IDBRequest` and `IDBTransaction`, the `Blob` round trip, and the object store that
exists only because `onupgradeneeded` created it. **OPFS gets a hand-written double because Node has
no OPFS at all**, and the alternative was a browser in the suite on every commit, which
`AGENTS.md` §16 refuses; the double is defensible there and would not have been for IndexedDB, since
what those tests assert is the backend's own behaviour — a `NotFoundError` answering `null` on a
read and swallowed on a remove, any other failure coming back out, a failed write aborting its
stream rather than closing a half-written file. Two things to keep. **The tests are held to biting
by a mutation sweep** — nine changes to the two backends, run one at a time — and **the two that
survived the first draft were both the test's fault**: the hook emptying the store between runs was
creating the object store itself, so the upgrade path was never under test, and neither wrapper's
rejection arm was reachable, because IndexedDB queues its transactions and a write that never awaits
completion still reads back. Aborting a transaction under the backend is what produces the
abandonment those wrappers exist for.

The app is live at **https://disalytics.disa-67b.workers.dev** — an assets-only Cloudflare Worker,
`wrangler.jsonc` at the root, `deploy.yml` running downstream of a green `ci`. Every deploy is
checked by `bun run smoke` against the contract in `AGENTS.md` §13 and recorded as a GitHub
deployment. Pull requests get no preview deployment: previews are off since #33, and `AGENTS.md`
§15 has the one-command way to turn them back on.

**#308 put the buy on the team card, and the load-bearing part is that the card did not move.**
A side's equipment value for the round sits on the head the side letter already occupied, so a
reader answers "can this side fight this round" without adding up five money figures — which is not
even the same question, since those five are cash in hand. Five things to know. **The rule is
`demo-core`'s** — `roundEquipment` beside `roundSurvivors`, reading `Round.economy[].team` rather
than `PlayerInfo.team` for the reason every other per-round reading does: the end-of-match roster
names the wrong side for every round before the swap. **`features/timeline/helpers/economy.ts` was
the second copy of that sum** — written for the unbuilt match overlay, unreferenced but not dead —
and it is a caller now, so the day one of them is corrected both are. **Everything on the head is
one type rank**, 11px against 11px: a 12px figure beside an 11px label grows the line box, and §5.1
sizes the plate from this card below the split, so the difference would come out of the map. Measured
over a real parse in both locales, branch against `main` at `a72c2ae`: plate **716 at 1440×900 and
473 at 1024×800**, card 291 and 108, head 13.75px — **identical on both arms in all four
combinations**, 0 elements overflowing a seat by the probe that measures against the seat's own
padding box rather than the viewport. **The word is on screen rather than `sr-only`** because every
row below already carries a dollar figure meaning something else, and two amounts on one card with
nothing to tell them apart is a worse reading than none. And **it does not roll** — `Money`'s
`isSliding` is false, which is that component's own rule: a round's equipment is a fact about a
round rather than a balance moving. Warmup states nothing at all rather than `$0`, because a zero
there is a reading and the absence of a round is not. **The live figure is not built and that is the
row's own boundary**: `equipmentValue` is sampled at freeze-time end only, so a total that stays
true while a round is fought is a new `TickTrack` column and a `SCHEMA_VERSION` bump. The bundle is
232.77 → **232.85 kB gz**, and §16's two frame rows are stated as unmoved rather than re-measured:
this is text at the 10 Hz readout and a ten-entry sum per card, and nothing new reaches the frame
channel.

**#310 made a grenade a row in the feed, and the load-bearing part is that the row expires.** §5.4
said *who killed whom* and §7.1's axis said *who threw what*, so a cloud on the plate had no author
anywhere a reader could reach. A fourth `RowEvent` kind fixes that, and five things ride with it.
**`grenadeEndTick` in `packages/demo-core` is one definition of a grenade's life** — `visibleGrenades`
was carrying it inside a per-tick predicate, and the feed needed the same answer as a window, so the
predicate is expressed in terms of it rather than beside it; a row is on screen exactly while its
mark is on the plate. **That window is what makes the row affordable**, and it was measured rather
than argued: on the fixture a grenade row costs the eight `FEED_ROW_LIMIT` holds a kill on **8.88%**
of 44,004 frames and **never the round's most recent kill** — 0 of the 24,435 frames that had one —
where the same rows with no window read **34.77%** and lose the newest kill 348 times. `ROADMAP.md`
carries both numbers, and **`FEED_ROW_LIMIT` was deliberately not touched**: tuning eight to make
room for utility is a different decision from adding the row. **`timeline.grenade` is
`events.grenade` now**, which is #214's rule arriving for the fifth string rather than a tidy-up — a
sentence two surfaces say belongs to the slice they both import, and this is the moment the axis
stopped being its only speaker. **Hovering or focusing a row draws that grenade's own path**, in the
utility's colour rather than §6.2's white, because a plate mid-round holds several paths and the hue
is what says which row asked; it is **not** gated on §10.5's trajectories row, for the reason the
kill line is not, and it is **still clipped by `clock.frame`**, so a grenade caught in the air draws
only as far as it has flown. And **`namedKill` still refuses a grenade a tooltip** — the reason it
gave ("a grenade is on no feed at all") stopped being true here, so the comment says why the refusal
is now a question about the axis rather than about the feed. Two numbers: the plate is **716 at
1440×900 and 473 at 1024×800** in both locales, unchanged, and the bundle is 232.85 →
**233.09 kB gz**. `AGENTS.md` §16's two frame rows were re-measured against a `9992173` baseline —
0 frames over 16.7 ms out of 399, three passes an arm, both arms.

**#313 gave the round axis a filter, and the measurement says the collapse was never the thing to
fix.** #271 lets a glyph fall back to a tick when its neighbour is closer than one glyph's width,
and on the fixture at 1440×900 that leaves **98 symbols out of 751** with **46 of 212 kills** drawn —
which is #271's own count reproduced, and is what a rule for a simultaneous pair does to a round
where **518 of the 751 glyphs are grenades**. Six things are load-bearing. **The filter runs before
`glyphHitHalves`**, which is the whole mechanism rather than an ordering detail: a slot is half the
way to the nearest *drawn* mark, so taking utility away widens the survivors and the same untouched
rule hands them their symbols back — 233 glyphs, **130 symbols, 116 of 212 kills**, and 41 → 82 at
1024×800. `GLYPH_PITCH_PX` and `hasRoomForSymbol` are not retuned and the collapse stays as the floor
for what no filter can separate. **The axis is not shorter for the control**, measured on both arms:
886.55px at 1440 and 518.55px at 1024, identical, because the switches sit at the end of the round
strip's row — the control row below is 40px of primary control, the axis and the speed control with
no slack, and the one thing that may not pay for a filter is the axis it exists to un-crowd. What it
costs is the strip: a pill goes 39.59 → 35.06px at 1440 and 27.33 → 22.80px at 1024, and all 30 keep
their numbers down to a **940px** viewport. **The state is on the screen rather than behind a
button**, and that is why there is no popover and no settings row: these preferences outlive the
session, and a filter the reader cannot see they left on is a match quietly missing its marks the
next morning — `packages/i18n`'s `filters` namespace, declared and empty since the redesign, is
where the strings went, and this is its first tenant. **The subject is the fourth switch and it is
disabled with nobody selected**, naming the precondition instead of looking broken; the preference is
remembered while it is unreachable, and `isBySubject` counts a kill for its attacker, which is the
rule `EventGlyphs` already applied when it raised the selected player's marks. Measured over a real
round: the ten seats' counts under that switch are **5, 6, 4, 1, 2, 1, 3, 0, 1, 6 — 29, the round's
whole event set**, partitioned with nothing lost or double-counted. And **`AxisFilter` deliberately
stays in `features/timeline`**: `ROADMAP.md` M5 calls this the filter system's first caller, and
promoting a facets-plus-subject interface to `core/` with one caller to check it against is guessing
rather than learning. Two smaller things ride with it — `GlyphSize` gains `control` (16px, which is
`Button`'s own icon size and not a fourth drawing scale), and `UtilityGlyph` gains `hasOwnInk`,
because a `ghost` control is dimmed by the row it sits in and a colour the component sets last is one
that row cannot beat. The bundle is 233.09 → **233.97 kB gz** and §16's two rows were re-measured
against a `3e20603` baseline the same hour.

**#315 let a zoomed plate take the whole stage, and the answer the owner gave is not one of the two
the question offered.** `ROADMAP.md` had been holding a decision since the redesign — may a zoomed
plate go under the cards, or only fill its own cell — and the answer is the whole stage **with every
card still on it and every reading still on the card**. The plate's cell takes the stage's width
while the reader is zoomed in, the map runs behind the cards, and nothing is hidden, moved or made
unreachable. Six things are load-bearing. **The map is fitted to the plate's short axis**, which is
the one line that makes this an expansion rather than a magnification: the width the plate wins shows
*more map*, and a needle, a halo, a hairline and a token are the same size in both states.
`features/radar/helpers/view.ts` is the only seam it needed — `plateExtent` and `offsetOn` are read by
the scale, by the pan clamp and by the pointer inverse, so the four layers changed nothing and the
backdrop stopped being the one place that derived its own geometry. **An axis the map does not reach
across centres it and pins it**, which is the rest plate's own rule arrived at from the other side: a
wide plate at 1.25× has the whole map's width on screen and pans vertically only, and the offsets are
clamped *as they are read*, so a shape change under a stale pan cannot put the map off the plate for a
frame. **A canvas is not sized like a `div`, and it is wrong in both directions.** It carries an
intrinsic ratio from its backing store: in the grid, `height: 100%` resolved against a row that ratio
had already sized — a 1392×657 cell holding a **1392×1392** canvas, clipped by an ancestor and so
invisible to #199's viewport sweep — and out of the grid, a replaced element with `inset: 0` keeps its
intrinsic width rather than stretching to the four edges, which is 716 of a 1392px cell. `inset-0`
places it and `size-full` sizes it. **The cards have to name a layer.** An expanded plate is a
positioned grid cell, and a positioned cell paints over every static sibling whatever the DOM order
says, so the two team cards and the cluster column carry `z-10` — without it half the stage would have
been under the map and half over it. They also stop swallowing the map around them: the column that
holds the cluster and the feed is a full-height box with nothing in most of it, and `pointer-events`
is what gives the drags back to the plate showing through. **The zoom controls must not follow the
cell** — pinned to the expanded plate's own bottom-right they landed under the CT card and the reader
lost both of them; §6.3's original formula is written against `min(100cqi,100cqb)`, which is the map's
own square in either state, so leaving it alone is what keeps the pair on the map. And **below the
split the grid does not change at all**: the strip there runs the full width of the stage, so a plate
that took its row would have put every pixel it gained behind an opaque card and its own controls
under one — what the reader gains at those widths is the letterbox the square used to leave, 1024
across against 473. Measured on the fixture in `en` and in `ru`, branch against `main` at `2615053`:
the plate is **716 at 1440×900 and 473 at 1024×800 at rest on both arms** — 1× is untouched, which was
the owner's constraint — and **1392×657** and **1024×473** zoomed, with the team cards, the timeline
block and the corner at the same rects in every state and **0 elements overflowing**. The bundle is
233.97 → **234.14 kB gz** and §16's two rows were re-measured with the plate expanded, which is 1.78×
the canvas: 0 frames over 16.7 ms in every playback pass on all three arms, and on scrub the single
frame this row has always warned about lands on `main` in three passes of three, at rest in two, and
expanded in one.

**#290 gave a displaced name a line back to its own token, and the option the owner took is the
middle one of three.** #289 gave `labelPlacer` twelve candidate boxes where it had four, which took a
buy phase from 40% of its labels buried at 1440×900 and 70% at 1024×800 to 0% — at the cost of a name
that may now sit three rows out, where it is nearer to somebody else's token than to its own. The
issue put three answers on the table: do nothing, draw the line, or bound the ring and give the tenth
label its burial back. Five things are load-bearing. **The rule is the placer's, not the label's** —
`LabelPlacer.isDisplaced` says whether the last `place` reached past the *cardinal four*, which are
the boxes §6.1 means by "beside", so the same instrument that decides where a label goes decides
whether it is owed a line. **Every line is drawn before any name**: the pass places all ten boxes,
strokes the lines, and only then writes the glyphs, because a line drawn as its own name was written
would be laid over every name placed after it — a hairline crossing a nickname is a worse defect than
the one this fixes. That cost three small typed arrays owned by the pass, which is the shape the rest
of that draw already has. **Only a name gets one.** The hit's figure goes through the same placer and
is displaced more often, and it needs no line because it already has the tie a name does not: the
token it belongs to is flashing in the same colour on the same frame. **The line runs from the rim to
the nearest point of the box** — for the row above a token that is a plain vertical, which is the
shortest statement of "this one" the geometry allows — and it draws nothing at all where the box is
already against the token, so the mark appears exactly where the ambiguity does. And **§10.6's legend
draws it**, which takes the swatch count to eighteen; its box is 56×28 against a plate where a
displaced label sits up to three rows out, so the swatch chooses the distance the way `TRACER_LENGTH_PX`
already chooses a reach. Measured over #289's own eight windows — two rounds × a buy phase and a
mid-round × 1440×900 and 1024×800 × a player selected and not — **0% of labels buried in all eight**,
unchanged, with **2 to 4 of ten labels displaced** per window and so carrying a line; placement is
untouched by construction, since the change adds no candidate and moves no `place` call. §16's two
rows were re-measured against a `d90cb0f` baseline the same hour: **0 frames over 16.7 ms out of 399,
three passes an arm, both arms**, out of round 7's buy phase rather than out of a round where nobody
is clustered. The bundle is 235.77 → **236.26 kB gz**.

**#312 gave the axis's tooltip the rule the file had already written down.** `namedKill` refused a
tooltip to everything but a kill, and stated its own reason for the refusal: a tooltip is permitted
*because §5.4's feed draws the same row*, so the fact stays reachable without hovering — a tooltip
may shorten a route, it may not be one. Measured against that rule the line was in the wrong place
for **three of the four kinds the feed draws**. A grenade satisfied it from #310, where the feed
gained its row; a plant and a completed defuse had satisfied it for longer than that and were being
refused by nothing at all. It is `namedRow` now, and the refusal is exactly one case — an **aborted
or interrupted** defuse, which the feed does not carry, so a tooltip for it would be the only route
to its own fact. Three things to know. **The predicate is the rule rather than a list of kinds**,
which is what stops the two drifting again: anything the feed draws is named, and the one thing it
does not is refused by name. **`AxisEvent` is assignable to `RowEvent`** and the type says so —
`NamedRow.event` is `RowEvent`, so a kind that reaches the tooltip without everything the row needs
is a compile error rather than an empty line; that is what the grenade arm's new `throwerSide` is
for, and it comes from `sidesBySlotAtRound` the way a kill's two ends already did, never from
`PlayerInfo.team`. And **a defuse's `status` is the one field the row has no use for** — §7.1 draws
all three statuses where the feed draws only the completed one — so it stays on the axis's own arm
and is what the refusal reads. No new string, no second drawing: `EventRow`'s four arms and
`labelFor`'s four cases were all already built.

**#249 answered the legend's last open question by building the answer and then taking it out.**
The vision cone is the one §6.1 mark the legend names in words, and the reason recorded for that had
been false since #232: it said the geometry sat inside the token layer around a gradient the layer
cached, so lifting it out would move a frame path. `visionWedge()` has been a factory that owns its
own cache since then, so the sheet can hold one of its own — and the entry was written, drawn by
that factory, and passed the sentinel-palette test unchanged. **It is still not drawn, and the
reason is the swatch.** What makes the cone legible on the plate is *area* rather than ink: it is
painted at α0.15 fading to nothing across its whole radius, which is around 140px there against 18
in a 56×28 tile — a sixtieth of the area. Measured in the built sheet, the swatch reads α0.063 at
10px from the token and α0.031 at 14, and a throwaway build that stood the same drawing on a
mid-grey ground looked identical, which is what rules out the tile's own ground as the cause. The
alternative is `plate-legend.ts` choosing an opacity, and that is the one thing that file may not do
— its whole argument is that nothing in it decides what a mark looks like. Two things worth keeping.
**The issue's stated argument against was scale, and scale was the wrong objection**: three entries
already choose their own reach — `TRACER_LENGTH_PX`, `AUDIBLE_RADIUS_PX` and #290's leader — so
"every other entry is drawn at its true size" stopped being true before this issue was read. And
**the words carry no number**, which is what makes the drift risk the issue was built around small:
the entry says "the cone of what they can see" and never states the angle or the reach.

**#328 deleted the axis's collapse, and the measurement is what says #313's floor was never a
floor.** #271 collapsed a glyph to a 2px tick whenever its hit slot is narrower than one glyph's
width, and #313 kept that rule "as the floor for what no filter can separate" — the argument being
that turning utility off widens the survivors and hands them their symbols back. Measured on a
professional match rather than on the fixture, it does not: on `main` at 1440×900 the dust2 map of
IEM Atlanta 2026 draws **57 symbols out of 677 glyphs** and **14 of its 144 kills**, and with
utility off it is **44 of 155 glyphs and 35 of 144 kills** — so the reader who has already thinned
the round still cannot see three quarters of what they asked for. The anubis map reads 82 of 729,
and at 1024×800 both fall to the twenties. Every one of 24 rounds carries a collapse in every filter
state. So `hasRoomForSymbol` is deleted rather than retuned, and every glyph draws its symbol.
Three things to know. **The press is untouched**, and that is what makes an overlapping cluster
affordable: #268's `glyphHitHalves` still tiles the axis with targets that cannot overlap, the
symbol is still laid over the slot with `pointer-events-none` rather than inside it, and
`GLYPH_PITCH_PX` still sizes that target — the constant lost one reader, not its job. **Nothing is
nudged**, which is the part of #271 that survives whole: a mark moved off its own moment is a lie
about time on a time axis, so a cluster is drawn on top of itself and the reader separates it with
the filter beside the axis or with the arrow keys. And **the filter is now the only thing that
thins a round**, which is the shape #313's own roadmap row asked for and stopped one step short of.
The counting is `axisGlyphs` → `filterGlyphs` → `glyphHitHalves` driven in Bun over a real parse, so
the figures are the shipped code's own rather than a sweep of the DOM.

**#330 put two matches in the library before the reader has a demo, and the decision it closes was
smaller than everyone thought.** `ROADMAP.md` had been holding "what exactly ships, and whose names
are on it" since the redesign, with a size ceiling under it: a static asset is capped at **25 MiB**
and a parsed 300 MB demo was assumed not to fit until it was trimmed to a few rounds. Measured, a
whole match is **10.28 MiB** (inferno) and **13.15 MiB** (dust2) as a container and **2.89 and
3.90 MiB gzipped** — so nothing is trimmed, and what ships is two maps of the IEM Atlanta 2026
series between Natus Vincere and Vitality, published by HLTV. Professionals rather than ten private
people is the whole of the names answer. Six things are load-bearing.

**No `.dem` is committed and the rule is not bent** — what is in the tree is the *parse* of one,
which is the same container `packages/demo-store` writes into OPFS after any parse, so the app needed
no second format and the library needed no second kind of entry. **The bytes are spent on a press**:
nothing is fetched before it, verified in the built bundle with an empty resource list on the library
screen, and the service worker's `globPatterns` is `html,css,js`, so a sample is not precached — which
would otherwise have cost every visitor 6.8 MiB. **A downloaded sample is an ordinary saved demo from
that moment**: it is written under `sample:<id>:${SCHEMA_VERSION}`, so `staleKeys` evicts it on a
schema bump exactly as it evicts everything else, the library lists it as a saved card, and removing
it is the removal that already existed — the sample card comes back afterwards, measured over the
whole round trip. **The container is decompressed in the page rather than by the server**: naming
`Content-Encoding` would leave the browser to do it, and a proxy that re-compresses the response —
which Cloudflare may — would hand the page bytes through gzip twice and out of it once.
**`bun run samples:check` is what stops a stale one shipping**, and the failure it exists for is
silent: a `SCHEMA_VERSION` bump makes every committed container unreadable, `decodeDemo` throws, and
the card answers a press with a failure on a build whose tests, types and bundle are all green —
because nothing else in the repository reads those bytes. Regenerating them needs the demos, which
live on the owner's machine and never in CI, so what CI can do is refuse. And **the codec moved onto
its own entry point** — `@disa/demo-store/codec` — because `bun run samples:generate` runs in Bun and
the store's barrel reaches IndexedDB and OPFS: a Node-side script cannot typecheck against the
package at all through the front door.

Two smaller things. **A sample that will not download is its own `OpenFailure`** rather than
`cacheGone` — nothing was read, and what the reader needs told is that this is the network and not
the match — and the `restoring` state gained a `download` block, so the same screen that says
"opening from cache" says "downloading the match" with a percentage when there is one to say.
**Two of three maps ship**, and the cost that decided it is the repository's history rather than the
platform: anubis is 4.32 MiB, adding it back is one row in `catalogue.ts`, and every regeneration
after a schema bump lands in git again. Measured in both locales at 1440×900 and 1024×800: **0
elements overflowing**, two cards in each, and the bundle is 236.33 → **237.61 kB gz, 47.5%**.

**#332 gave the way in a background and a promise, and it is the only screen in the product allowed
a colour that means nothing.** The upload screen was a correct box in the middle of an empty viewport
with the words *Open demo* on it twice — once as a heading and once as the button under it — over a
Mirage plate at 15% opacity that read as noise rather than as a map. What replaces it is
`PixelBackdrop`: **Dust2's own radar plate, sampled once per cell of a 10px grid and drawn as squares
that breathe**, with the product's sentence at `text-44` standing on it above a card that now holds
the action alone. Two owner decisions paid for it, both taken on 6 September 2026. **`ogl` is
spent** — approved since #200 for exactly this and unspent ever since — at **17.2 kB gz**, taking the
bundle 237.59 → **254.82 kB, 51.0%**. And **`ROADMAP.md`'s "no chromatic accent in the chrome" is
narrowed rather than dropped**: it governs the screens that show a match, the way in shows none, and
the grid gets `--color-pixel-1` and `--color-pixel-2` of its own so that nothing carrying a reading
is reused as decoration.

**The first build of it was a gradient-wave field and the owner rejected it on sight**, which is the
part worth keeping: what makes this screen worth looking at is that the thing on it is *the product's
own material*, and an aurora is decoration that any product could have had. The revision cost one
dependency decision that was **not** taken — the reference the owner pointed at runs on
`three` + `postprocessing`, which is around 200 kB gz against a 500 kB budget standing at 252, and
the same pixelation is a dozen lines of GLSL in the `ogl` already installed.

Six things are load-bearing. **The map is a texture rather than an image behind glass**: the grid
samples it once per cell at the cell's own centre, so what is drawn is the map at the grid's
resolution rather than the map with a mesh over it. **Presence is the map's and size is the wave's**
— a cell exists where there is map under it and its size says where the wave has got to, which reads
as breathing where a changing hue would read as data. **Two facts decide a cell, and both are
needed**: alpha says whether the map is there at all (a radar asset is transparent outside its own
outline, and the texture clamps at its edge, which without the test paints a stripe of the rim across
the screen), and the brightest channel says whether this is structure or the plate's own ground —
measured off the asset, the blue theme puts its ground near 0.15 against 0.30 for a wall, and a
luminance reads both as almost nothing. **The buffer is capped at a device pixel ratio of 1.25**: the
cells are a fixed size in CSS pixels, so there is nothing here for resolution to resolve, and dpr 2
quadruples the fragments on a laptop about to spend every core it has on a parse. **It keeps moving
through a real parse** — M7's own constraint on this row, measured with a 462 MB demo dropped in and
the grid still moving between two composited screenshots at 0%. And **reduced motion draws exactly one
frame**, through `@disa/ui`'s own setting rather than a second reading of the media query.

Four things to know if this is touched again. **The hero needed a scrim and the mean is what hides
that**: a single lit cell behind a glyph took the worst *pixel* of §14's contrast to **2.73** against
a floor of 4.5 while the mean read 14, and a radial `color-mix` of `--color-surface-0` under the
reading takes the worst back to **11.08–12.36** without touching the field around it. **The
instrument for "is it still moving" is a screenshot, not `readPixels`**: a WebGL drawing buffer is
cleared once it has been composited, so `readPixels` after the frame returns the same bytes for ever
— it read one constant hash across idle, reduced *and* parsing, which looks exactly like a shader
that never runs. **A patch sampled for that has to be somewhere the picture actually changes**: the
first region chosen sat inside the scrim, where two moments are byte-identical because there is
nothing there. And **`Page.captureScreenshot` with a `clip` and a `scale` tiles the page 2×2 when the
device metrics carry a `deviceScaleFactor` of 2** — the page is fine and the picture is the artefact.
A hidden tab is left alone and does not jump on the way back: six seconds away moved the ground by
0.209 of a mean channel where one second of drift moves it 0.593. The tagline moved out of the rail
in the same PR — it was the same sentence in two places — and `library.open.title` is deleted in both
locales.

**#339 gave the product a look, and the decision that shaped it is what it *refused* to spend.**
A third `palette` and a third `radarTheme`, chosen together as one look: a violet plate with cyan
and lime players on it. **The chrome takes no hue from it, on any screen** — the owner's call of
9 September 2026 — so §17 rule 5 and `ROADMAP.md`'s "no chromatic accent in the chrome" are exactly
where they were, and the primary action, the focus ring and the drag acknowledgement are still
white under it. Six things are load-bearing.

**A look is not a stored setting.** What is remembered is still `palette` and `radarTheme`, one key
each; `LOOKS` is a table that writes both at once and `lookOf` reads back which pair the reader is
standing on. A third key would be one that can disagree with the two it summarises, and the
disagreement would then have to be resolved somewhere. **`lookOf` returns `null` on a crossed pair**
and the control lights nothing — the colour-blind palette on a violet plate is exactly that, and a
row that picked one of the two looks there would be lying about what is on screen. `SettingChoice`
already rendered an empty selection; the type is what caught up.

**The palette numbers are measured rather than picked, and the instrument was checked before it was
trusted.** The script is #133's, and it reproduces `tokens.css`'s own committed contract exactly —
all thirty-six existing pairings to the last decimal, and #81's colour-blind floor of **ΔE2000
14.28** — before it was pointed at anything new. Two helpers were missing from that comment,
`from_linear` and `rgb_to_hex`, and reproducing 14.28 is what says they were restored correctly.

**The look clears §14 more comfortably than the default palette does.** Its eighteen pairings floor
at **5.35** (`--color-nade-decoy` on a card) against the default's 5.03. Its **dichromat floor is
ΔE2000 6.68**, smoke against decoy under protanopia — stated in `tokens.css` because a look that
quietly says two events are one colour is the defect rather than the low number. It is not held to
the colour-blind palette's 14.28 and does not claim to be; it is worth knowing it lands nearly four
times the *default* palette's own 1.83. Two candidates were rejected on measurement rather than
taste: the first draft floored at 3.85 under deuteranopia, and the second failed §14 outright with
`--color-nade-decoy` at 4.40.

**A generated theme is now a pair of ramps and nothing else**, which is what makes a third one
honest — every theme flattens the same terrain through the same window, so two cannot disagree about
what a wall is. `recolorToBlue` is `recolorTo(theme, source)`, and **`blue` is byte-identical across
that refactor**, which is the check that says the generalisation changed nothing. Eight images,
1.0 MB, taking the radar assets to three themes.

**The default look is unchanged by construction rather than by inspection**: the `tokens.css` diff
is *purely additive* — not one removed line — the `blue` and `vanilla` images are byte-untouched,
and a cascade cannot reach `:root[data-palette="cyber"]` without the attribute. Read back off the
live document, all three palettes compute exactly what the file states. Measured on the built
review screen under the look: 28 elements set text in a data colour, worst ratio **12.98**, which is
the table's own `ct on surface-1` figure reproduced by the page. In `ru` at 1440×900 the settings
sheet has **0 elements overflowing** by #278's rule. The bundle is 285.39 → **285.80 kB gz, 57.2%**,
all of it the third palette's tokens and two rows of interface; no new dependency.

One dev-only papercut found and left alone: `radar-assets`'s middleware caches its file map with
`??=` on first request, so an image generated *during* a dev session needs a server restart before
it is served. The built path emits every file at `buildStart` and is unaffected.

**#349 rode with it and the seam is not the one the issue proposed.** `plate-legend.ts` was 380
lines, and the cut it suggested — the catalogue against the drawing — could not work here because
the drawing *is* the catalogue: every entry carries its own closure, so the drawing half would have
stayed over 300 on its own. The seam taken is the plate's own, the one its layers already use: what
belongs to a **player** (`legend-token-marks.ts`, 231) against what records an **event**
(`legend-event-marks.ts`, 111). Both runs were contiguous in the array, so `PLATE_MARKS` is
`[...TOKEN_MARKS, ...EVENT_MARKS]` and the order nothing else may change is preserved by
construction rather than by care. **`legend-box.ts` (63) exists to stop a cycle**, not to group
anything: both lists read the swatch's box and the mark type, and `plate-legend` (30) reads both
lists. No consumer changed an import. The proof is a **hash of every draw call and its arguments**
per mark — the sentinel test #220 built records ink and ignores geometry, so it could not have
caught a moved constant — and it reads **18 of 18 marks identical** either side. `token-layer.ts`
(361), `utility-layer.ts` (329) and `round-axis.ts` (325) are **left**, deliberately: the first two
are on the frame path and so are held to #323's plate-hash standard rather than to a swatch's, and
each is its own argument.

**#335 put a round in the way in's pixels, and the reel it plays is cut from a parse rather than
from a demo.** The field behind the way in drew a map that breathed; it now plays round 22 of the
IEM Atlanta 2026 dust2 map in the same squares — ten players crossing it, utility blooming where it
went off and fading where it died. Seven things are load-bearing.

**The source is the sample container this build already ships**, so `bun run reel:generate` needs
nothing outside the tree and no `.dem` anywhere: the chain is `.dem` → container → reel and only the
first link is on the owner's machine. That is what lets `reel:check` do better than assert a shape —
**it regenerates and compares**, so the staleness check and the byte-stability claim are one run. It
sits beside `samples:check` in `ci.yml` for the reason that one exists: a `SCHEMA_VERSION` bump
rebuilds the containers, and a reel cut from the old ones is a background nobody can check against
anything.

**It is a module and not an asset.** #330's rule for this screen is that nothing is fetched before a
press, and an asset imported with `?url` is a request — so the reel ships inside the entry chunk.
Measured on the built bundle at 1440×900: **nine requests on the way in and 0 containers**, the list
`main` produces.

**`ogl` resolves an array uniform only when its value is a plain `Array`.** It walks the name GL
reports — `uAgents[0]` — and the branch that accepts the index tests `Array.isArray`, which a typed
array fails. The cost of getting that wrong is silent in the picture and loud in the console: every
frame renders, the field draws its map, and nothing the reel says arrives, which reads exactly like
a feature that was never wired up. The tell is `Active uniform uAgents[0] has not been supplied` in
a **fresh** console — the browser pane's holds stale entries, so it went on reporting a warning that
had already been fixed and would have reported none for the bug itself.

**A mark takes its cell rather than adding to it** — `max(breath, glow * 1.25)` and not a sum. Added,
a mark caught in a crest of the wave had a quarter of the range left to say anything with and
vanished into it; taken, a cell under a mark is always at the ceiling while the wave alone reaches
0.60, so the difference is the same everywhere on the field. The ceiling is what keeps the grid a
grid: 0.485 of a cell's box against the 0.5 where neighbours meet.

**The wave was compressed to about half its swing when the round arrived**, and that is the change
that made the screen legible rather than any change to the marks. It existed because nothing else on
the field moved; with a round playing it is texture, and at full amplitude it was the loudest thing
on a screen whose subject had become somebody else. **It is not compressed further than that**: at a
third, two frames of the map a second apart were byte-identical over a 300×300 patch — 8-bit
quantisation swallowed the whole remaining swing — which is a still image rather than a quiet one,
and it reads in a probe exactly like a shader that stopped.

**Precision is set by what the grid can show, not by what the number can hold.** A cell of the way
in's 10px grid is about 31 world units across, so the reel quantises to a whole world unit; a
quarter-unit step was measured against it and cost 236 bytes for precision nothing can display. On
that grid a **delta-coded integer array beats base64** — 3.51 kB gzipped against 3.77 on the round
first cut — and it takes `atob` and the byte-plane split out of the client, leaving `decodeReel` a
running sum. Undifferenced, the same tracks are 6.28 kB.

**Two numbers are rules rather than choices, and the first is the owner's steer of 9 September
2026.** The round is the one with the most events in it, ties going to the *longer* — a short round
packed with utility is a screen of smoke where a long one is an attack that goes somewhere, and this
is watched on a loop by somebody who is not being asked to read it. Three rounds tie at 47 events
and the longest is 124.8 s. The still a reader who asked for less motion is shown is the round's
**fullest** frame rather than its first, because frame zero is ten players on two spawns with
nothing thrown. Ten utility agents is a measurement — this round peaks at seven standing at once —
and the generator **fails** rather than dropping a mark, so a future reel that needs more says so at
build time.

**The way to check a reel is truthful is to draw it on the plate, not to look at the field.** A
throwaway probe painting every sampled position onto `packages/map-data`'s own dust2 image put all
ten tracks inside the map's corridors — mid, catwalk, long, tunnels — with **0 of 499 frames × 10
slots off the image**, which is what says the world→radar transform and the quantisation are right.
Nothing about the shader can answer that question, and the field at a 10px grid is far too coarse to
answer it by eye.

Measured over the built bundle in headed Chrome at 1440×900, `deviceScaleFactor` 1, with
`innerWidth`/`innerHeight`/`visibilityState`/`hasFocus` asserted inside the run: the worst pixel
behind the hero is **7.48** against §14's floor of 4.5; the field moves at rest (**five distinct
patch hashes of five**); **reduced motion draws one frame** (one of five); **a hidden tab does not
jump**, six seconds away moving the mean channel **0.003** against **0.065** for one second of
ordinary play; and the field **keeps moving through a real parse** — eleven samples during a 398 MB
demo's parse, eleven distinct.

**Two things about that run are worth more than its numbers.** A contrast figure here is only a
claim with a *duration*: the reel loops over 208 s, so eight frames sample three seconds of it and
read anywhere from 8.73 to 10.23 depending on where the round happens to be — 7.48 is a 40-frame
sweep across ~50 s, and the worst case it catches is exactly the one that matters, a player's own
lit cell passing behind a glyph. And **a killed run leaves its settings behind**: this script writes
`disa.motion` to test reduced motion, so a pass interrupted between writing and clearing it makes
the *next* pass measure a field drawing one frame — which reports as a still shader, a dead patch
probe and a flattering contrast figure all at once. It clears the key and asserts
`data-motion-reduce` is `null` before measuring anything now. The sibling trap is #332's own: **a
patch probe placed off the map reports a still field**, so the probe states its lit-pixel count and
a zero there is visible rather than implied.

The bundle is 275.29 → **285.39 kB gz, 57.1%**, and `AGENTS.md` §16's two rows are untouched: this
screen is never mounted on the review screen.

**#338 turned the shell's navigation ninety degrees, and what it bought is measured rather than
argued.** `SideRail` was 280px of every screen that is not the match, and #233's own reason for the
rail ending at the match is what a dock inherits turned on its side. Content at 1440×900 goes
**1160 → 1440**, and the library spends it on card width rather than on a column — **4 columns of
261px → 4 of 279px**, because `LibraryView`'s own `max-w-[72rem]` is what caps it, and widening that
measure is #336's decision and not this one. At 1024×800 nothing moves: the rail was a full-width
row below `--breakpoint-split`, so it never took horizontal width there, and the library is 3
columns of 317px on both arms. Six things are load-bearing.

**Nothing about where you are is in the magnification.** The current entry is `aria-current`, the
ink step, and a 16×3 bar the dock slides under it — `Highlight` in `children` mode, one `layoutId`,
so `motion` moves the same mark between seats on `transform`. That is §17 rule 9 in a product where
a magnifying dock is a pointer affordance, and it is why the bar is a bar rather than the rail's
pill: the entry *scales*, so its layout box never moves, and a mark sized from that box stays under
a glyph however far it has grown.

**The registry component was read and not added, and none of it survived the reading.** Upstream's
`Dock-TS-TW` animates each item's `width` and `height` and the panel's height with them, so every
pointer move relays out a row of six and the ground under it; it is a `motion.div` with
`role="button"`, `tabIndex={0}` and an `aria-haspopup` nothing pops up; it keys its items on the
array index; and its colours are three hex literals. `useDockMagnify` is 85 lines writing `scale` —
composited, no layout — and the declared `motion@^12.23.12` never met this repository's 13.1.0, so
`shadcn add` would have installed a second copy beside ours. The bundle moved **274.52 → 275.29 kB
gz, 55.1%**, all of it four lucide glyphs against a rail deleted.

**Touch degrades to nothing because nothing is written.** The listener returns on any
`pointerType` that is not `mouse`, so a tap sets no scale and there is none left behind when the
finger goes — measured, `['','','','','','']` after a touch move and `1.25` at the peak after a
mouse one. Reduced motion never attaches the listeners at all, and it was checked both ways round:
the reader's own `reduced` and the *device's* `prefers-reduced-motion` each read six empty scales.

**The entry's name is `sr-only` text on the control rather than an `aria-label`**, so an unfinished
one still reads *"Utility lineups Soon"* — the reading the rail's chip carried, which a glyph must
not cost. The label that rises above the dock restates it and is `aria-hidden` for that reason, and
it is raised by `:focus-visible` rather than by focus, or a pressed entry would leave its own name
standing over the content it opened.

**The band is reserved by `main`'s padding and the shell is `h-dvh` at every width.** The document
used to scroll below the split, and a fixed panel over a document scroller is the one arrangement
where the reader reaches the end of a library and finds the last row underneath it. Measured at
scroll end: **30px of clearance at 1024×600, 1280×560, 900×700 and 420×760**, 53 at 1440×900, and
the panel is 287×54 at every one of them. **The product name stays at the top left** — a wordmark is
not a control — and settings and help are the same `DockEntry` as the four views, without
`aria-current`, because two hover treatments in one 52px panel is a panel assembled from parts.

**The overflow sweep needed #278's rule to stay honest.** The hover label is absolutely positioned
and centred on a 40px seat, so it extends every ancestor's `scrollWidth` by design; a sweep counting
that reports thirteen elements at 1440 and says nothing true. Counting only an *in-flow* child past
its parent's padding box reads **0 elements overflowing** at 1440×900 and 1024×800 in `en` and in
`ru`, on both arms. `.app-shell` went with the rail: `h-dvh` says what its `min-height: 100dvh` said
and nothing else read the class.

**#345 rode with it, and the shape of the fix is what to keep.** Vite's static middleware treats a
`.gz` file as a pre-compressed copy of something else and names `Content-Encoding: gzip` on it, so
the browser un-gzipped the container and `decodeDemo` was handed raw bytes where it expects a gzip
stream — a sample downloaded with a clean `200` and refused to open, under `bun run dev` only.
`sampleContainers` **serves the bytes rather than patching the header a later handler will write**:
a patch has to guess between `setHeader` and `writeHead`, and the one it misses is the one that
reintroduces the bug in silence. Two things cost a round trip. **A request carrying a query is Vite
asking *about* the file rather than for it** — `?url` is answered with a module exporting the path,
and serving the container's bytes to that request breaks the import, because the browser refuses
`application/gzip` as a module script and the app never starts. And it is `configureServer` and
nothing else, so `dist` is untouched. Dev now reads `content-type: application/gzip` with no
`Content-Encoding`, which is what production has always sent, and the fixture sample opened onto the
review screen in **10.9 s** from the press.

**#323 rode with it too, and the seam #322 declined is the one that opened.** `labels.ts` was 476
lines holding four things that never ask each other anything, and the reason that PR gave for
leaving them was the whole problem: `placeDamage` needed `isOnPlate`, `LABEL_HALO_PX` and
`LABEL_HEIGHT_PX`, so a `damage-figure.ts` that owned the placement would have imported back into
the file importing it. `label-box.ts` (118) is every size and box; `label-subject.ts` (60) is what a
pass is *given*, the names included; `damage-pass.ts` (80) is the hit's figure and **shares the
caller's placer** rather than owning one, which is what keeps every name placed before any figure
and so keeps a figure giving way to a name; `labels.ts` is 292 and re-exports what it exported
before, so nothing outside `features/radar/helpers` changed an import. The plate is **pixel-identical
across 12 states — 6 rounds × a player selected and not, 12 distinct hashes, 12 of 12 matching** —
and §16's two frame rows are **not** re-measured, deliberately: a move that adds one cross-module
import to a function already called per label per frame is not a shape change, which is #264's own
rule. The check is cheap now for a reason worth knowing: **#330's committed sample is what makes a
plate hash reproducible without a `.dem`**, so the arm setup is a press on a card rather than a demo
somebody has to hand over.

**#43 and #352 registered the service worker, in one PR at the owner's direction, because the two
halves are useless apart.** A route served offline by a worker nobody registers changes nothing, and
a registered worker with no prompt is the cache-sticky shell `AGENTS.md` §12 warns about. Five things
are load-bearing. **`useWorkerUpdate` in `core/pwa` registers `/sw.js` itself, production only, and
`injectRegister` stays `false`**: the plugin's script would register without asking, and
`virtual:pwa-register` would bring `workbox-window` into the page for what `navigator.serviceWorker`
already does in thirty lines. **A new worker waits for the reader's press** — `SKIP_WAITING_MESSAGE`
is the one string both sides import — and **every tab reloads on `controllerchange`**, not only the
one that pressed, because a tab left on the old chunks asks a precache `cleanupOutdatedCaches` has
emptied and a server that only holds the new hashes. **The notice is the way in's alone**: a reload
on the review screen drops the reader's place in a match, and the old worker goes on serving the old
shell whole until they leave it. **The offline half is one `NavigationRoute` onto the precached
`index.html`**, because the app has no routes of its own — #43's `/round/12/kill/3` never existed,
and the only path anything sends here is the manifest's `/open`. `workbox-routing` is *declared*
rather than new: it was already in the tree as `workbox-precaching`'s own dependency, and the owner
approved the declaration. And **Cloudflare's 307 on `/index.html` needs nothing** — Workbox's
precache copies a redirected response, and the cached shell reads 200 with `#root` in it. Measured on
the built bundle through `wrangler dev`: a first install shows no notice; with the server stopped,
`/`, `/open`, `/round/12/kill/3` and `/no-such-route` all render the way in under the worker's
control while an uncached fetch fails; a second build with a changed precache raises the notice, and
one press reloads **both** open tabs onto the new worker; the header holds **0 elements overflowing**
at 1440×900 and 1024×800 in `en` and `ru`, measured against the header's own padding box as well as
the viewport. The bundle is 285.80 → **286.28 kB gz, 57.3%** — `sw.js` 5.65 → 5.80 and the entry
chunk +0.29 — against `main` at `322ba90`, rebuilt the same hour.

**#354 put a position inside each pass on the parse screen, and the profile that placed the hook
also re-scoped the speed half of the same `ROADMAP.md` row.** The readout stepped 0 → 33 → 67 → 100
because upstream offered no hook inside a pass, and a `.dem.zst` said "decompressing" for the whole
of the first pass. Five things are load-bearing. **The hook is the second-pass frame loop's own
`self.ptr`**, handed from `Parser::on_position` to `SecondPassParser::on_position` on the
single-threaded path — eight added lines in `vendor/`, listed in `vendor/README.md`, observing and
never steering. Upstream's *first* pass has none because it needs none: `CS2_PROF` over the 398 MB
IEM Atlanta inferno map put it at 0.070 / 0.041 / 0.040 s against 2.169 / 3.742 / 2.442 s for the
second, so the second is the whole of each of our passes. **`Progress` in `crates/demo-parser` owns
the arithmetic and the deduplication**: every pass an equal share, each whole-number percentage
handed to the observer once, 100 only when the last pass has *completed* rather than read to its
end, and all of it in `u64`, because a demo's length times a hundred overflows `usize` on `wasm32`.
The observer sits in a `RefCell` because upstream's hook is a shared `Fn`, called synchronously, so
two borrows never meet. **A container reports the compressed bytes its decoder has consumed** —
`Counted`, a `Read` wrapper — which is the one position both codecs can state, and the phase becomes
`parse` the moment the first pass starts. **The parser owns the phase now**: `parseDemo` takes
`onProgress(phase, percent)`, and `passCount` and `DemoBuffer.isCompressed` went with the worker's
own percentage maths, which was their only reader. And **`cargo fmt --all` reformats `vendor/`** —
it follows path dependencies, which `lefthook.yml` and `wasm.yml` already knew and
`vendor/README.md` denied until this PR corrected it — so read the vendored diff as additions only
before committing. Measured: a real parse in the built bundle read **101 distinct percentages,
strictly rising, 0 to 100 in 12.8 s** on the inferno map, and `wasm:smoke` now fails on 50 or fewer;
the hook costs nothing measurable, interleaved against a `main` worktree over three rounds — native
**7.06 → 7.08 s** and WASM under Bun **11.50 → 11.53 s**, each inside `main`'s own spread. The same
profile moved #355: **5.74 s of the 8.73 s parse is entity decoding repeated once per pass**, so the
room in the speed half is the three passes rather than anything inside one. Found on the way and
left as its own task: the fixture's area-grenade assertion fails on that inferno map on `main` too.

**#355 took the parse from three passes to two, and `vendor/` did not change.** `docs/PARSER.md` §3
read upstream's `collect_entities` as returning early whenever events are wanted, so events, tick
columns and trajectories took a pass each. That return sits inside `if !event_with_velocity`, and
upstream sets the flag when events are wanted beside a prop that needs velocity — which
`TICK_PROPS` has asked for since #111. `match_pass` now carries `wanted_events: ["all"]` beside the
tick props. Four things are load-bearing. **It is the same parse, proved rather than argued**: a
hash of the whole `ParsedDemo`'s `Debug` form matched `main` on the fixture and on the IEM inferno
map, and the committed snapshot changed in its `passes` line alone. **`velocity` is structural
now** — without it the merged pass collects no columns, which `Ticks::of` refuses loudly, and
`PASS_COUNT`'s comment says so. **Trajectories keep their own pass**, because `collect_projectiles`
writes `tick`, `steamid` and `name` under the same ids the player loop writes into the same `df`;
one pass would be upstream reworked rather than configured. And **the tick table is released before
the projectile pass** with `mem::take` on `df`, since the events the grenades still need live in the
same `DemoOutput`. Measured on the built bundle, drop to review screen, container fixture, arms
interleaved in one hour: **15.72 → 13.45 s**, which gives §16's parse row headroom it had not had;
natively 8.99 → 7.52 s on the fixture and 7.02 → 5.45 s on the inferno map. The cost is memory:
upstream copies every wanted player prop into every event, so WASM linear memory peaks **849 →
897 MiB** on the fixture, inside §16's 1.5 GB.

**#358 made double-clicking a demo open it, which the manifest had promised since Phase 1.**
`file_handlers` named `/open` and three extensions and `launch_handler` was `focus-existing`, and
since #352 the app installs — but nothing read `window.launchQueue`, so an installed app opened on
the way in and dropped the file. `useLaunchedFiles` in `core/pwa` is the whole of it. Three things
to know. **The file reaches the same `open` a drop does**, as the `File` that `getFile()` returns
rather than as the handle §12 used to name: a `File` is a reference to the disk, so the worker still
reads the bytes, and the store fingerprints a `File` anyway. **`launchQueue` exists in an ordinary
Chrome tab too**, so its presence is no evidence of a launch; the consumer is simply never called
there. And **a launch cannot be verified over `--remote-debugging-port`**: Chrome 152 lists the
`PWA` domain in `/json/protocol` and answers `wasn't found` to every command on both the browser
and the page target, because it attaches that domain to a trusted session only — over
`--remote-debugging-pipe`, `PWA.install` and `PWA.launchFilesInApp` work. Measured that way on the
built bundle with two public IEM demos, one app window throughout: a cold launch parses at `/open`,
a second file launched mid-parse replaces it and reaches the review screen, and a third launched
into an open match replaces that. TypeScript's DOM library has no `LaunchParams`, so
`launch-queue.d.ts` declares the three names used, and the handle is narrowed with
`instanceof FileSystemFileHandle` rather than cast.

**#360 gave the match its own navigation, and the decision behind it is where the control may not
go.** `ROADMAP.md` M5's first row had been a question since the redesign — where a view switch lives
and what it costs the stage — and it blocked every other row in that milestone. The owner's answer
of 12 September 2026 is that **a view replaces the stage**: a view is a place rather than a sheet
over a paused match. Four things are load-bearing. **The switch may not take a grid row.** The plate
is `min(100cqi, 100cqb)` of the cell the stage's grid leaves it and three of the four widths this
repository quotes a plate figure at are height-bound, so a strip of tabs along either edge is a
subtraction from the map — the same reasoning that ends `ShellDock` where the match begins. **That
rules out a third line in the corner too**, which is what the first draft of the branch had: the
seats ride on the way out's own 40px line instead, and they are glyphs rather than names because
four names — longer again in Russian (§17 rule 7) — do not fit beside it. Measured on both arms in
both locales, the plate is **716 at 1440×900 and 473 at 1024×800, unchanged**, and the corner simply
widens where the column lets it (280 above the split, 296 in `en` and 311 in `ru` below it). **The
hooks stay above the branch**, so the transport, the shortcut table and the sheets are the same ones
the stage was using: `V` walks the four views and the clock reads the same `00:19` on the way out and
on the way back. And **the unbuilt views are listed and honest**, exactly as the shell lists the
screens it does not have — `MatchSoon` says what each will hold and nothing else. Two smaller things
ride with it: `common.soon` replaces `library.shell.soon`, because two slices say that word now
(#214's rule), and `useMatchReadout` takes the 10 Hz derivations out of `MatchReview`, which the
switch had pushed past 300 lines. The bundle is 286.30 → **287.59 kB gz**, all of it four lucide
glyphs and the switch.

**#362 drew a match's duels on a map of their own, and it needed no new mark, no new colour and no
new field.** The **Maps** seat #360 built said "Soon"; behind it now is every kill in the match as a
line from where the killer stood to where the victim fell — §5.4's own ring, disc and line, from the
same three helpers, over a whole match instead of over one hovered row. Six things are load-bearing.
**`matchDuels` in `demo-core` is the rule, and it is one rule**: a duel's ends are read at *its own*
frame, its two sides are the ones those slots held **that round** — `PlayerInfo.team` is the
end-of-match roster and names the wrong side for half a match — and a kill by the world is left out
because it has no point on the map to come from. Rounds and kills are both sorted by tick, so it
walks each list once. **`duelPlot` is `killLineGeometry` run at scale 1 and copied out**, rather than
a second reader of `TickTrack`: the positions are resolved once, the draw multiplies by the plate's
scale, and a resize re-reads nothing. **A canvas is not sized like a `div`** — #315's finding, met
again from the other side: `aspect-square max-h-full` measured **1100×1100 in a 793px cell** and ran
off the bottom of the screen, because a replaced element carries an intrinsic ratio and a cap is not
a size. It is `min(100cqi,100cqb)` of a `container-type: size` box, which is the stage's own rule.
**Below the split the controls are a strip above the map, not a column beside it**, and that is the
same measurement one row down: a column there is a grid *row*, and the plate is measured from what
the row leaves — the first draft read **121px at 1024×800**. It is `TeamCard`'s answer at another
size, and the plate reads **793 at 1440×900 and 581 at 1024×800** in both locales. **Both narrowings
read the attacker**, which is `isBySubject`'s rule on the round axis: a side's duels are the kills it
got, so a kill cannot count for a player in one place and against them in another. And **the
narrowing is not remembered**, deliberately unlike #313's four axis filters: those hide marks on a
screen the reader did not come to for them, where this screen *is* the reading and leaving it is the
gesture that ends it. One thing was built and taken out — a sentence for an empty narrowing, which
the count line already states as `0 duels`, and #205's rule is that what is on screen twice is not a
reading. Measured on the shipped dust2 sample: **144 duels, 89 CT and 55 T**, a partition with
nothing lost; the stage untouched at **716 at 1440×900** with the round clock reading `01:55` before
and after a full `V` round trip; one element overflowing in either locale at either width, the way
out's deliberate `-10px`, which `main` reports too. The bundle is 287.59 → **288.98 kB gz**.

**`AGENTS.md` outranks anything you observe in the file tree.** If existing code contradicts the
docs, the code is the thing that is wrong.

---

## Hard rules — violating one is a bug, not a trade-off

Full text in `AGENTS.md` §2. Condensed:

1. **No server ever touches a `.dem` file.** No uploads, no demo bytes in any network request.
2. **Parsing runs in a Web Worker.** The main thread never opens, decompresses, or parses a demo.
3. **Per-tick data lives in typed arrays (columnar/SoA), never arrays of objects.** Events are the
   opposite — plain sorted arrays of objects, binary-searched by tick.
4. **`clock.frame` never lives in React state, Zustand, or signals**, and nothing subscribed to the
   frame channel writes into React. Plain mutable object + rAF.
5. **No `localStorage`/`sessionStorage` for parsed data.** OPFS first, IndexedDB fallback.
   UI preferences (locale, theme) are fine there.
6. **No `any`.** No `@ts-expect-error` without a comment and a linked issue. No `!`, no silencing
   `as`.
7. **No hardcoded user-facing strings.** Everything through i18n, `en` *and* `ru` together.
   `demo-core` and the parser emit `{ key, params }`, never display text.
8. **Parsing is deterministic.** Same bytes + same `SCHEMA_VERSION` → byte-identical output.
9. **Playback and scrub hold 60 fps, and that budget is the whole of the rule.** No property is
   banned by name and no moment is off limits — the interface may animate while the match runs.
   What changes on a *canvas* is still a function of `clock.frame`. `AGENTS.md` §16's assertion is
   the enforcement, and when it fails the motion is what goes. Twice narrowed: #130 dropped the ban
   on DOM motion during playback, #275 dropped `transform`/`opacity` only.
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
bun run bitfields:check   # FLAG_* / GRENADE_* parity between the same two files
bun run tokens:check   # every class and var(--…) resolves in the built CSS (build first)
bun run mapdata:generate  # map constants + themed radar images; byte-stable across runs
bun run icons:generate    # weapon outlines from apps/web/assets/weapon-icons; byte-stable
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
