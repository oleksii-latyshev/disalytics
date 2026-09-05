# ROADMAP

What is left to build, in milestones, with a priority and a rough size for each. The authority for
*how* is `CODE_REQUIREMENTS.md` and `CONTRIBUTING.md`; this file only says *what next* and *why in
this order*. Issue numbers are the source of truth — where a row and its issue disagree, the issue
wins. A row with `—` in the `#` column has no issue yet: it is a description of work, not a promise
about its shape, and the issue is where it becomes one.

**Sizes** are one issue → branch → PR loop: **XS** trivial, **S** one session, **M** two or three,
**L** four or more, or a decision that has to be made first.
**Priority** is P0 blocking a promise the product already makes, P1 next, P2 wanted, P3 tidy.

M1–M3 are the backlog the repository already carries. **M4–M7 are the owner's list of 4 September
2026**, which is where the product goes next; none of it has issues yet, and four rows on it need a
decision before they can have one — those are collected under *Decisions this list owes* rather than
buried in the tables.

---

## Constraints we work inside

Two kinds, and the difference matters: a **hard** row cannot be spent, negotiated or refactored
away; a **chosen** row is ours, and changing it is a decision for the owner rather than a bug.

| Constraint | Value | Kind | Why it exists |
|---|---|---|---|
| No server ever sees a `.dem` | absolute | **hard** — product definition | The whole promise of the product. It is also why hosting is an assets-only Worker with no `main`, and why there is no account, no upload and no telemetry over demo bytes. Everything else on this list follows from it. |
| Static asset file size | 25 MiB | **hard** — Cloudflare, all plans | Platform ceiling on any single file we serve, the WASM binary included. It is not a free-tier limit; paying does not raise it. **M7's sample match is the first row that has to fit inside it.** |
| Static asset count | 20 000 per version | **hard** — Cloudflare free plan | Not near it. Would only bind if radar themes multiplied. |
| Hosting cost | effectively zero | **hard** — free plan, on purpose | Static asset requests are not billed as Worker requests. A server-side feature ends that, which is a second reason `apps/api` is "Later" and not "next". |
| No COOP/COEP headers | absolute | **hard** — follows from serving a plain SPA | Costs us cross-origin isolation: no `SharedArrayBuffer`, no WASM threads, and no way to measure true tab memory (§16's memory row is an estimate for this reason). **It is also the ceiling on M7's "make the parse faster"** — threads are not available to spend. |
| Upstream needs three passes over a demo | fixed | **hard** — `demoparser2`'s shape | Query batching cannot go below it, and reading only a header still costs a full pass. Phase 0 settled this, and it is why the parse screen counts in stages rather than smoothly. |
| A backgrounded tab parses ~5× slower | fixed | **hard** — Chrome confines it to efficiency cores | 15.3 s in front, 84.9 s behind, on one machine. No code here can prevent it; the parse screen says so instead (#68). |
| `navigator.storage.persist()` may return `false` | fixed | **hard** — the browser's call | Cached parses are best-effort. Eviction is designed for, not prevented. **Anything a coach draws is subject to it too** — see M6. |
| OS file-handling (`launchQueue`) | Chromium desktop only | **hard** — browser support | Drag-and-drop and the picker must keep working everywhere. |
| JS bundle, excluding WASM | < 500 kB gzip (at 233 kB) | **chosen** | Startup speed, not a platform or a billing limit. It is what makes a new runtime dependency a decision. **232.74 kB, 46.5%** at `9c58662` + #284, which deleted the empty `motion-features` chunk. The redesign added exactly one runtime dependency in total, `@base-ui-components/react` in #276, against two font families deleted. A charting library, a drawing library or a physics-shaped smoke model would each be the next such decision. |
| WASM binary | < 4 MB (CI fails > 24 MB) | **chosen** — a regression guard | The platform allows 25 MiB. 4 MB is a line we drew so a size regression is noticed the day it happens. **2.66 MB, 66.5%** since #66 spent 0.41 MB of it on the parse-time row above. |
| Parse a 300 MB demo | < 15 s | **chosen** — set from Phase 0's real number | The promise the parse screen makes. **Met since #66 built the binary at `-O3`** — 14.19 s on the 264 MB container against `-Oz`'s 18.85 s — and met with no headroom: the same build read 17.23 s on the slowest run of an hour on a machine 15% slower than the one #59 measured on. The room left is inside each pass, which is M7's row. |
| Peak tab memory during parse | < 1.5 GB | **chosen** | Headroom on ordinary laptops with the whole demo in linear memory. |
| Scrub and playback | 60 fps sustained | **chosen** — enforced by measurement | This is the product: review, not replay. It is what pays for hard rules 3, 4 and 9, and what decides an argument between accuracy and smoothness. Every new mark on the plate — a tracer, a smoke cloud, a coach's drawing — is measured against it. |
| Cached demo reopen | < 3 s (at 0.02 s) | **chosen** | Second visit must feel instant, or the cache is not worth its complexity. |
| Positional sampling | 16 Hz | **chosen** | Memory math (§6.1). If duel or lineup analysis needs more, the answer is detail windows around the moments that need them, not a higher global rate. |
| `en` + `ru`, always together | absolute | **chosen** | Layouts are designed against the Russian string. Game vocabulary stays English by rule. |
| No light theme | decided 12 Aug 2026, re-affirmed 1 Sep 2026 | **chosen** | Doubles the token layer, re-opens every contrast measurement, needs a third radar plate. |
| No chromatic accent in the chrome | decided 1 Sep 2026 (#276) | **chosen** | Colour means something the demo said. The primary action, the focus ring and the drag acknowledgement are all white. |
| `backdrop-filter` only on the full-screen sheets | decided 1 Sep 2026 (#276) | **chosen** | Every other surface is opaque with a hairline. It is why "no card may overlap the radar plate" is now a legibility preference rather than a frame budget — which is what makes M4's zoomed plate a decision rather than a violation. |
| Core crate free of `wasm-bindgen` | absolute | **chosen** — strategic | Keeps a native Tauri build possible without a rewrite. |
| No `.dem` committed, ever | absolute | **hard** — it is ten real people's data | CI cannot test parsing breadth; the fixture is developer-supplied and the snapshot pins one demo. Unit tests carry the breadth instead. **M7's sample match is the first thing that asks to bend this**, and the answer is a decision, not a workaround. |
| Multi-demo comparison | out of scope for v1 | **chosen** | Scope, so v1 can ship. The utility lineups screen is the one exception already agreed: it collects across demos on the device without comparing matches. |

---

## M1 — Close Phase 2: the parser keeps its promises

The parse-time budget was the one number on the constraints table the shipped build missed, and #66
closed it — what is left here is the parser's other promises.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #53 | Canonical weapon vocabulary | One enumeration behind the five vocabularies a demo carries, so a missing icon or a bad filter is a type error. **Blocked**: needs evidence one demo cannot supply. | P2 | L |

**Closed on 4 September 2026**: #73 (the README describes the live product) and #60
(`bun run bitfields:check`, in both workflows for the reason `errors:check` is). One blocked row is
all that is left of this milestone.

## M2 — Close Phase 3: the radar's unfinished corners

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #78 | Decide where the radar asset listing is checked | A map added without its image fails a check instead of a screen. | P2 | S |
| #58 | Name a bomb plant's site from `map-data` | A plant reads "A" rather than a coordinate. **Blocked** — the demo carries no site name. | P2 | M |
| #86 | Verify multi-level rendering on a real Nuke demo | The two-level radar is proven rather than assumed. **Blocked** on a Nuke demo. | P2 | M |

## M3 — The review screen's open defects and decisions

The redesign is closed (below). What is left here is defects and decisions on the screens it built.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #292, #294 | The highlight effect writes `aria-selected` where it may not | Two places where a decorative element and a plain button carry an attribute their role does not allow. One vendored primitive, two call sites. | P1 | S each |
| #290 | Decide what a label two rows from its token belongs to | #289's twelve candidate boxes buried 0% of labels, at the cost of a name that can sit far from the token it names. | P1 | S |
| #287 | A hit shows what it took | A token flashes for damage and says nothing about how much, which is the difference between a trade and a whiff. | P1 | M |
| #123 | Fail CI when a documented contrast ratio drifts | The 36 pairings `tokens.css` now states stay true without anyone re-running the maths by hand. | P2 | M |
| #115 | Let the reader choose the radar plate | The reader who wants the game's own map colours can have them. | P2 | M |
| #249 | Decide whether the legend draws the vision wedge | Draw it or record why not — the reason it was not drawn no longer holds. | P2 | S |
| #170 | Restate §6.2 for utility that reads as smoke and fire | **Answered by M4's smoke and fire row rather than before it.** | P2 | XS |
| #230 | Measure a shotgun's shot count | Whether nine pellets are one `fire_bullets` event or nine. **Blocked** on a demo that fires one. | P3 | S |

**Closed on 4 September 2026**: #275 — hard rule 9 is the 60 fps budget and bans no property by
name, which is the owner's call rather than a reading of the old wording; #214 — the axis glyph's
accessible name carries the weapon and the three marks, out of an `events` namespace both surfaces
own; #284 — `LazyMotion` and `m` are deleted, because the split point measured 157 bytes and could
not be made real; #116 — the density trace has drawn `--ink-dim` at α0.30 since the match overlay
was built; #118 — the round picker it names was replaced by the round strip.

---

# The owner's list, 4 September 2026

Sixteen items, grouped into four milestones by what they touch rather than by the order they were
written. Nothing here has an issue yet.

## Decisions this list owes

Four rows cannot be started until the owner answers something, and each answer is worth more than
the row it unblocks.

| Row | The question | Why it is a decision and not a detail |
|---|---|---|
| M7 — a sample match in the library | What exactly ships, and whose names are on it? | The constraints table forbids committing a `.dem`, and the reason is that it is ten real people's data — a *parsed* demo carries the same names and SteamIDs, and shipping it publishes them. The choices are: ship a parse with the roster anonymised, ship it as-is with the players' consent, or ship nothing and let the front door explain itself. There is a size ceiling underneath the choice too — a single static asset is capped at 25 MiB, and a parsed 300 MB demo is not that small until it is trimmed to a few rounds. |
| M4 — the zoomed plate fills the screen | May a zoomed plate go under the cards, or only fill its own cell? | "No card overlaps the plate" has been structural since #147: the plate is in a grid cell no card is in. Filling the cell fully is free and needs no decision. Covering the cards is a different product — the reading cards go away while the plate is zoomed, and that is the owner's call. |
| M6 — a coach's drawing is "saved in the demo" | Saved *where*? | A `.dem` is the reader's own file and is never written to — hard rule 1 and the store's whole design. Annotations can live beside the cached parse, keyed by the same cache hash, which means they survive a reopen and are lost by an eviction the browser is allowed to make. Making them durable is what M7's export file is for. |
| M7 — share a match as a file | What is in the file: the parse, or the reading of it? | A parsed demo is typed arrays measured in tens of megabytes; JSON of it is several times that, which is not a file anyone sends. A file holding the *annotations* — bookmarks, drawings, notes, the round they belong to — plus the hash of the demo they were made against is small, sends over any channel, and is useless without the demo. Both are defensible; they are different products. |

## M4 — The stage reads better

The screens exist and are wrong in specific ways. This is the cheapest milestone on the list and the
one the owner looks at every day.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #308 | A team card states what the side is holding | The buy total per side, so a card answers "who can afford this round" without adding up five numbers. **The round's own figure is free** — `PlayerEconomy.equipmentValue` is already read at freeze-time end. A total that stays true *during* a round is not: equipment value is sampled only at wanted ticks, so a live figure is a new `TickTrack` column and a `SCHEMA_VERSION` bump. Ship the round figure first and decide whether live is worth the bump. | **P1** | S |
| — | Give the axis its glyphs back, and a filter beside it | #271 collapsed a crowded glyph to a tick because 29 of 30 rounds overlapped. The owner's answer is better: keep the marks at full size and let the reader turn kinds off — kills, utility, objectives, and the selected player — so a dense round is thinned by choice rather than by the axis. The collapse stays as the floor for what no filter can separate. Persisted where every other preference is, and read where it is obeyed. | **P1** | M |
| — | A grenade is a row in the feed | The feed says who threw what, so a cloud on the plate has an author. The data is there — `Grenade` carries its thrower and its throw tick — and the work is a fourth row kind, both locales, and the same hover-to-the-plate the kill rows already have. Its window is the grenade's own life, so scrubbing backwards takes it away like every other row. | P1 | S |
| — | A zoomed plate uses the whole stage | The zoom is capped by the square the plate is inscribed in, which wastes the width the stage actually has. Filling the plate's own cell is free of the overlap rule; going further is the decision above. Default framing is unchanged either way — that is the owner's constraint on this row. | P1 | M |
| — | A bullet reads as a bullet | Today a shot is a white spur past the needle, which says *fired* and not *at what*. A tracer from the muzzle along the shooter's own view angle says the second thing. **Where it ends is the open question** — the schema carries no impact point, so either upstream's impact events come into the parse (a `SCHEMA_VERSION` bump) or the tracer is a fixed-length ray that fades, labelled as the approximation it is. It must be a function of match time like every other mark, and it is drawn ten times per second per shooter, so it is measured against the 60 fps row before it ships. | P2 | M |
| — | Smoke and fire drawn as they spread | One flat disc per cloud reads as a symbol; the game's own smoke fills a volume over about a second and fire is a set of flames that spreads and dies unevenly. Drawing that as a cluster of overlapping puffs, animated **from match time and never from wall time**, is what makes a mid-round smoke legible as cover rather than as an icon. Answers #170. The frame budget is the whole difficulty: this multiplies the marks on the plate by roughly the number of puffs, so the allocation-free draw rules apply without exception. | P2 | M |
| — | A grenade in the feed opens its lineup | Pressing a grenade shows where it was thrown from, where it landed, and the view angles at the throw — enough to stand on the same spot in the game and reproduce it. Three unknowns make this the largest row in M4: view angles are sampled at 16 Hz, so at the throw tick they are up to 31 ms stale and a lineup needs better than that (a detail window around throws, which is a `SCHEMA_VERSION` bump); whether the demo carries the buttons held at the throw — a jump-throw is a different lineup from a standing one — is unresearched; and the run-up matters as much as the angle. **Research first, then an issue.** | P2 | L |

**#308 closed the first row on 5 September 2026** — the round's figure, on the card's own head, at
the type rank the head already spends so the plate measures the same either side of it. What it
deliberately did not spend is the bump: a total that stays true *while* a round is fought is still a
`TickTrack` column and a `SCHEMA_VERSION` move, and whether the reading is worth one is a decision
this row hands to the owner rather than an omission.

## M5 — Analysis surfaces

The mission statement is "40 minutes into 10". Everything in M4 makes the match readable; this is
what makes it *answerable*. It is the largest milestone in the product and it wants breaking into
issues one screen at a time.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| — | Filter system | The reader narrows a match to what they came for — a player, a side, a weapon, a round range — and every surface obeys the same filter. This is the mechanism the "40 minutes into 10" promise rests on, and nothing else on this list replaces it. **M4's axis filter is its first caller**, and building that one honestly is what tells us what this needs to be. | **P1** | L |
| — | A place to switch views within a match | The match gains its own navigation — the stage, the full scoreboard, and the map-shaped readings below. It is one decision (where the control lives and what it costs the stage) and then several screens; the decision is P1 and blocks the rest of this milestone. | **P1** | M |
| — | The match scoreboard | Kills, deaths, assists, damage, and the per-round detail behind them, for both sides at once — the reading that is too big for a team card row and the reason the row's expand was deleted. | P1 | M |
| — | Heat map | Where a player spent the match and where they did their damage, per side and per round range. It is the first surface that reads the whole `TickTrack` rather than a frame of it, so its cost is a render decision, not a data one. | P1 | L |
| — | Duel map | Every kill as a line from killer to victim, filterable by player and by side — the same drawing the feed's hover already makes for one kill, over a whole match. | P1 | M |
| — | Utility map | Where a side's smokes, flashes and fires land, collected over the match. It is the per-match half of the lineups screen, and building it first is how that screen gets its shape. | P1 | M |
| — | Match metrics | The numbers a match produces that no map can show: economy over the rounds, clutches, opening duels, trades, multi-kills, utility damage, time blinded. The economy half already exists inside the match overlay and moves here rather than being rebuilt. | P1 | L |
| — | The economy overlay over the stage | The current round's buys and balances, raised over the match without leaving it. Distinct from the metrics screen: this one answers "what can they afford *now*", which is a question asked while watching. | P2 | M |
| — | Highlight extraction | The product proposes the moments worth watching — multi-kills, clutches, opening duels — instead of asking the reader to find them. Reads the same derivations the metrics screen needs, so it goes after it. | P2 | L |
| — | Utility lineups screen | The rail's third entry stops saying "soon": a map's smokes and flashes collected across the demos on the device. Wants M4's lineup row first, or it collects throws it cannot describe. | P2 | L |
| — | Player stats screen | The rail's fourth entry: a player across the demos on the device rather than within one. | P2 | L |

## M6 — The coach's tools

The first features in the product that *write*. Everything here needs the same foundation — an
annotation model beside the cached parse, keyed by the demo's hash, versioned like the parse is — and
building that once, in the first row, is what keeps the other two small.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| — | Bookmark a round | A coach marks the rounds worth returning to and opens the marked list from the stage. The smallest row in the milestone and the one that should carry the annotation store, because it is the cheapest place to get it wrong and find out. | P1 | M |
| — | Draw on the plate | Freehand and straight lines over the map, tied to a round, kept across a reopen. Three things decide the size: it is a second canvas over the plate rather than marks inside the frame path (hard rule 4 is not negotiable here), the drawing surface must be operable without a pointer or say plainly that it is not, and a stroke is stored as points in map coordinates so it survives a zoom, a pan and a themed plate. | P2 | L |
| — | Place utility on the plate | The coach says *this smoke here* rather than drawing a circle that means it — the same marks the renderer already draws, placed by hand at a round. Rides on the drawing surface and on the same store, and it is what makes an annotated round teachable rather than decorated. | P2 | L |

## M7 — Getting in, and getting out

Everything a reader meets before the match and everything they take away from it.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| — | A sample match in the library | Somebody who has no demo to hand can still see what the product does. **Decision first** (above): whose data ships and how it fits under 25 MiB. Once answered, the work is a bundled parse the library lists like any other entry, restored into the store on first run, undeletable or replaceable at the reader's choice. | **P0** | M |
| — | Make the parse faster, and honest about its progress | Two halves. The speed is #66 first, then whatever profiling says after it — three passes are upstream's and threads are not available, so the ceiling is real and the room is inside each pass. The progress readout is separate and cheaper: it steps 33 / 67 / 100 because a pass is all we are told about, and a per-pass position — ticks read against ticks in the file — would make it move continuously. That figure has to come from upstream, so it is a `vendor/` deviation and belongs in `vendor/README.md` with the two already there. | **P0** | M |
| — | The way in earns its place | The upload screen is correct and forgettable. It should be the first thing that says this product was made carefully — minimal, one idea, and moving only where movement means something. Two constraints shape it: whatever moves has to keep moving *while a demo parses* on a machine whose cores are busy, and a background worth having may be the first spend of the `ogl` approval that has sat unspent since #200. | P1 | M |
| — | Share a match as a file | A coach hands a reviewed match to somebody else. **Decision first** (above) on what the file holds. Either way it is an export and an import in the library, a version on the file, and a refusal that explains itself when the file does not match the demo on this device. | P2 | M |

---

## M8 — Phase 6: PWA polish

The manifest and the service worker are built; the worker is deliberately never registered, because
registering it before an update prompt exists makes the shell cache-sticky with no way out.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| — | Register the worker **with** an update prompt | The app installs and updates without a stale shell trapping the reader on an old `SCHEMA_VERSION`. These are one PR, never two. | **P1** | M |
| #43 | Serve client routes offline from the precached shell | A route opened offline shows the app, not the browser's error page. | P1 | S |
| — | Consume `launchQueue` | Double-clicking a `.dem` in the OS opens it here — the best interaction the product has, feature-detected, with the picker intact everywhere else. | P1 | M |
| — | Runtime caching for the WASM binary and the fonts | Both stay out of the precache; the first parse shows a visible download instead of a pause. | P2 | S |
| — | Install prompt | Installing is offered once, on the reader's terms. | P2 | S |

## M9 — Later, and deliberately not scheduled

Each of these ends a constraint above, which is why none is next.

| Task | Note |
|---|---|
| `disalytics.gg` | An account-level DNS step, not code. |
| #34 — retire preview deployments on PR close | **Blocked**: previews are off since #33, so there is nothing to mark inactive. Re-opens with them. |
| `apps/api` — accounts, shared review links | The first thing here that needs a server. Ends the "effectively free" row and touches hard rule 1's blast radius. It is also the other answer to M7's share row, and the expensive one. |
| `apps/landing` | Separate from the app shell. Wanted once there is something to announce. |
| Tauri native shell | Only if native parsing proves worth a second shell. The core crate stays `wasm-bindgen`-free to keep it possible. |
| `.nav` mesh occlusion for audibility | Revisit after M5. Today's model is a named approximation and says so. |
| Multi-demo comparison | Off the v1 scope on purpose. The lineups and player screens collect across demos without comparing matches, which is as far as v1 goes. |

## Candidates, not commitments

Readings a review tool of this kind is usually expected to have, that nobody has asked for here yet.
They are listed so the M5 screens are designed knowing they may arrive, not because they are
scheduled.

| Candidate | What it would answer |
|---|---|
| Trades and entry duels | Whether an opening death was traded, and how long it took. Falls out of the kill list and a time window; the metrics screen should leave room for it. |
| A per-round contribution figure | Rounds a player did something in — a kill, an assist, a survival, a trade — rather than a kill total, which flatters the wrong players. |
| Flash effectiveness | How long a flash blinded whom, and whether a teammate walked into it. `Blind` already carries the duration per affected player. |
| Utility damage | Damage by grenade, per player and per side. The damage list already carries the weapon. |
| Follow a player | The plate keeps one player centred through a round, which is the closest thing to watching a demo from their eyes that a 2D plate can do. |
| Search the match | "Show me every round where they lost the bomb site" as a query rather than a scrub. It is the filter system taken one step further and should not be built before it. |

---

## Worth knowing

- **The order is real.** M1 before everything because a budget the shipped build misses outranks a
  screen that reads slightly wrong — and M7's parse row is the same number seen from the front door.
  M4 is next because it is cheap and the owner reads those screens daily. M5 is the largest thing
  in the product and the one the mission statement depends on.
- **The redesign is closed.** It ran from 1 to 3 September 2026 as #276–#280 and replaced the visual
  system whole. The constraints table carries the closing bundle figure, `AGENTS.md` §16 carries the
  closing frame counts, and two constraints it created — no chromatic accent in the chrome, and
  `backdrop-filter` on the two full-screen sheets only — are on that table rather than in a
  milestone.
- **"Blocked" mostly means "needs a demo we do not have."** #53, #58, #86 and #230 all wait on
  evidence rather than on work. If a Nuke demo or a shotgun round appears, three of them unblock the
  same afternoon. M4's lineup row is the same shape: it waits on a measurement, not on a decision.
- **An open issue can be older than the screen it names.** #116 and #118 are both in that state.
  Check the code before starting a row here.
- **There is no design document any more.** It was deleted on 1 September 2026 along with the system
  it described, deliberately. What replaced it is the token layer's own comments, which state their
  measured numbers. A screen decision is recorded in the PR that makes it.
- **Sizes here are not commitments.** They are what an issue of this shape has cost so far in this
  repository, which is one PR per issue and a squash merge. The M4–M7 sizes are the least reliable
  on the page: nothing there has been through an issue yet, and three of them contain a research
  question that could halve or double them.
