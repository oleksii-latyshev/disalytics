# ROADMAP

What is left to build, in milestones, with a priority and a rough size for each. The authority for
*how* is `CODE_REQUIREMENTS.md` and `CONTRIBUTING.md`; this file only says *what next* and *why in
this order*. Issue numbers are the source of truth — where a row and its issue disagree, the issue
wins.

**Sizes** are one issue → branch → PR loop: **XS** trivial, **S** one session, **M** two or three,
**L** four or more, or a decision that has to be made first.
**Priority** is P0 blocking a promise the product already makes, P1 next, P2 wanted, P3 tidy.

---

## Constraints we work inside

Two kinds, and the difference matters: a **hard** row cannot be spent, negotiated or refactored
away; a **chosen** row is ours, and changing it is a decision for the owner rather than a bug.

| Constraint | Value | Kind | Why it exists |
|---|---|---|---|
| No server ever sees a `.dem` | absolute | **hard** — product definition | The whole promise of the product. It is also why hosting is an assets-only Worker with no `main`, and why there is no account, no upload and no telemetry over demo bytes. Everything else on this list follows from it. |
| Static asset file size | 25 MiB | **hard** — Cloudflare, all plans | Platform ceiling on any single file we serve, the WASM binary included. It is not a free-tier limit; paying does not raise it. |
| Static asset count | 20 000 per version | **hard** — Cloudflare free plan | Not near it. Would only bind if radar themes multiplied. |
| Hosting cost | effectively zero | **hard** — free plan, on purpose | Static asset requests are not billed as Worker requests. A server-side feature ends that, which is a second reason `apps/api` is "Later" and not "next". |
| No COOP/COEP headers | absolute | **hard** — follows from serving a plain SPA | Costs us cross-origin isolation: no `SharedArrayBuffer`, no WASM threads, and no way to measure true tab memory (§16's memory row is an estimate for this reason). |
| Upstream needs three passes over a demo | fixed | **hard** — `demoparser2`'s shape | Query batching cannot go below it, and reading only a header still costs a full pass. Phase 0 settled this. |
| A backgrounded tab parses ~5× slower | fixed | **hard** — Chrome confines it to efficiency cores | 15.3 s in front, 84.9 s behind, on one machine. No code here can prevent it; the parse screen says so instead (#68). |
| `navigator.storage.persist()` may return `false` | fixed | **hard** — the browser's call | Cached parses are best-effort. Eviction is designed for, not prevented. |
| OS file-handling (`launchQueue`) | Chromium desktop only | **hard** — browser support | Drag-and-drop and the picker must keep working everywhere. |
| JS bundle, excluding WASM | < 500 kB gzip (at 233 kB) | **chosen** | Startup speed, not a platform or a billing limit. It is what makes a new runtime dependency a decision. **232.95 kB, 46.6% of budget** at the close of the redesign (#280), against 229.21 kB for `main` at `9d95208` on a clean build the same hour — the 3.74 kB is Base UI's accordion, arriving with the settings sheet's first caller for it. The redesign added exactly one runtime dependency in total, `@base-ui-components/react` in #276, against two font families deleted; everything since is that package being spent screen by screen. |
| WASM binary | < 4 MB (CI fails > 24 MB) | **chosen** — a regression guard | The platform allows 25 MiB. 4 MB is a line we drew so a size regression is noticed the day it happens. |
| Parse a 300 MB demo | < 15 s | **chosen** — set from Phase 0's real number | The promise the parse screen makes. #66 is what keeps it true for compressed demos. |
| Peak tab memory during parse | < 1.5 GB | **chosen** | Headroom on ordinary laptops with the whole demo in linear memory. |
| Scrub and playback | 60 fps sustained | **chosen** — enforced by measurement | This is the product: review, not replay. It is what pays for hard rules 3, 4 and 9, and what decides an argument between accuracy and smoothness. |
| Cached demo reopen | < 3 s (at 0.02 s) | **chosen** | Second visit must feel instant, or the cache is not worth its complexity. |
| Positional sampling | 16 Hz | **chosen** | Memory math (§6.1). If duel analysis needs more, the answer is detail windows around kills, not a higher global rate. |
| `en` + `ru`, always together | absolute | **chosen** | Layouts are designed against the Russian string. Game vocabulary stays English by rule. |
| No light theme | decided 12 Aug 2026, re-affirmed 1 Sep 2026 | **chosen** | Doubles the token layer, re-opens every contrast measurement, needs a third radar plate. |
| No chromatic accent in the chrome | decided 1 Sep 2026 (#276) | **chosen** | Colour means something the demo said. The violet accent it replaces sat ΔE2000 0.9 from `--color-ct` under deuteranopia, which is what #222 was about; the primary action, the focus ring and the drag acknowledgement are all white now. |
| `backdrop-filter` only on the full-screen sheets | decided 1 Sep 2026 (#276) | **chosen** | Every other surface is opaque with a hairline. It is why "no card may overlap the radar plate" is now a legibility preference rather than a frame budget. |
| Core crate free of `wasm-bindgen` | absolute | **chosen** — strategic | Keeps a native Tauri build possible without a rewrite. |
| No `.dem` committed, ever | absolute | **hard** — it is ten real people's data | CI cannot test parsing breadth; the fixture is developer-supplied and the snapshot pins one demo. Unit tests carry the breadth instead. |
| Multi-demo comparison | out of scope for v1 | **chosen** | Scope, so v1 can ship. |

---

## M1 — Close Phase 2: the parser keeps its promises

The parse-time budget is the one number on the constraints table the shipped build does not meet.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #66 | Ship the binary at `-O3` | Opening a demo finishes inside 15 s for the compressed file most people actually have, not only a raw one. Costs 0.40 MB of a half-spent budget. | **P0** | S |
| #73 | Bring the README up to the repository | The front door stops saying "nothing is deployed" about a product that is live. | P1 | S |
| #75 | Cover both cache tiers without a browser | The IndexedDB half of the store is covered by the suite rather than by remembering to open a browser. | P1 | M |
| #60 | Fail CI when the `flags` bitfield drifts | A bit layout stated in two languages cannot silently disagree — the same guard `errors:check` already gives the error union. | P2 | S |
| #53 | Canonical weapon vocabulary | One enumeration behind the five vocabularies a demo carries, so a missing icon or a bad filter is a type error. **Blocked**: needs evidence one demo cannot supply. | P2 | L |

## M2 — Close Phase 3: the radar's unfinished corners

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #78 | Decide where the radar asset listing is checked | A map added without its image fails a check instead of a screen. | P2 | S |
| #58 | Name a bomb plant's site from `map-data` | A plant reads "A" rather than a coordinate. **Blocked** — the demo carries no site name. | P2 | M |
| #86 | Verify multi-level rendering on a real Nuke demo | The two-level radar is proven rather than assumed. **Blocked** on a Nuke demo. | P2 | M |

## M3 — Finish Phase 5: the review screen's remaining defects

`docs/DESIGN.md` §15 is complete — every step it asks for has code. What is left is defects and
decisions, not screens.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #271 | Make a cluster of axis glyphs readable, not only pressable | #268 fixed which glyph takes a press; a dense cluster still cannot be *read*. **Rides with #279.** | P1 | M |
| #123 | Fail CI when a documented contrast ratio drifts | The ratios `tokens.css` states stay true without anyone re-running the maths by hand. | P2 | M |
| #115 | Let the reader choose the radar plate | The reader who wants the game's own map colours can have them. | P2 | M |
| #249 | Decide whether the legend draws the vision wedge | Draw it or record why not — the reason it was not drawn no longer holds. | P2 | S |
| #230 | Measure a shotgun's shot count | Whether nine pellets are one `fire_bullets` event or nine. **Blocked** on a demo that fires one. | P3 | S |
| #275, #214, #170 | Three documentation corrections | Rule 9 and colour transitions; what §9.2 permits where no feed is drawn; §6.2 restated for utility that reads as smoke and fire. | P2 | XS each |
| #143 | Commit the dev server launch configuration | The browser tooling starts the app without being told how each session. | P3 | XS |
| #116, #118 | Re-check, then likely close | Both name screens that no longer exist — the density trace moved behind the match overlay and the round picker was replaced by §7.3's strip. | P3 | XS |

## M3.5 — The redesign

One visual system, built once and then applied screen by screen. The owner asked for it on
1 September 2026: minimal and premium, on [animate-ui](https://animate-ui.com)'s Base UI components,
with a near-black neutral ground. `docs/DESIGN.md` was deleted rather than rewritten — the token
layer's own comments carry what it used to say, and #276's issue body carries the decisions.

**Closed on 3 September 2026 with #280.** All five rows landed; the constraints table above carries
the closing bundle figure and `AGENTS.md` §16 carries the closing frame counts. Two constraints this
milestone created are stated on that table rather than here — no chromatic accent in the chrome, and
`backdrop-filter` on the two full-screen sheets and nowhere else — and both survived the last row
unchanged. What did not survive is `--duration-instant`: a fourth duration step the new system never
spent, deleted in #280 rather than left for a caller to rediscover.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| #276 | Rebuild the token layer and the component kit | One system: neutral near-black surfaces, hairline structure, Onest, and the registry's components behind three boundaries. Closes #121 and #222. | **P0** | L |
| #277 | Redress the way in | The rail, the drop target, the library, the parse and failure states. | P1 | M |
| #278 | Redress the stage | The plate's surround, the team cards, the feed, the scoreboard, the corner controls. | P1 | L |
| #279 | Redress the timeline block and the transport | The round strip, the timeline, the transport, the match overlay. Closes #271. | P1 | L |
| #280 | Redress the sheets and land the motion pass | Settings, help, one pass over every transition, and the measurements that close the redesign. Restated #123 rather than closing it — the figures are all measured and recorded now, and turning that into a CI check is that issue's own work. | P1 | M |

## M4 — Phase 5's two unbuilt features

Named in the shell's own navigation, with no issue yet.

| Task | Goal | P | Size |
|---|---|---|---|
| Filter system | The reader narrows a match to what they came for — a player, a side, a weapon, a round range — and every surface obeys the same filter. This is the mechanism the "40 minutes into 10" promise rests on, and nothing else on this list replaces it. | **P1** | L |
| Highlight extraction | The product proposes the moments worth watching — multi-kills, clutches, opening duels — instead of asking the reader to find them. | P1 | L |
| Utility lineups screen | The rail's third entry stops saying "soon": a map's smokes and flashes collected across the demos on the device. | P2 | L |

## M5 — Phase 6: PWA polish

The manifest and the service worker are built; the worker is deliberately never registered, because
registering it before an update prompt exists makes the shell cache-sticky with no way out.

| # | Task | Goal | P | Size |
|---|---|---|---|---|
| — | Register the worker **with** an update prompt | The app installs and updates without a stale shell trapping the reader on an old `SCHEMA_VERSION`. These are one PR, never two. | **P1** | M |
| #43 | Serve client routes offline from the precached shell | A route opened offline shows the app, not the browser's error page. | P1 | S |
| — | Consume `launchQueue` | Double-clicking a `.dem` in the OS opens it here — the best interaction the product has, feature-detected, with the picker intact everywhere else. | P1 | M |
| — | Runtime caching for the WASM binary and the fonts | Both stay out of the precache; the first parse shows a visible download instead of a pause. | P2 | S |
| — | Install prompt | Installing is offered once, on the reader's terms. | P2 | S |
| — | Player stats screen | The rail's fourth entry, and §5.6's answer to everything too big for an expanded row. | P2 | L |

## M6 — Later, and deliberately not scheduled

Each of these ends a constraint above, which is why none is next.

| Task | Note |
|---|---|
| `disalytics.gg` | An account-level DNS step, not code. |
| #34 — retire preview deployments on PR close | **Blocked**: previews are off since #33, so there is nothing to mark inactive. Re-opens with them. |
| `apps/api` — accounts, shared review links | The first thing here that needs a server. Ends the "effectively free" row and touches hard rule 1's blast radius. |
| `apps/landing` | Separate from the app shell. Wanted once there is something to announce. |
| Tauri native shell | Only if native parsing proves worth a second shell. The core crate stays `wasm-bindgen`-free to keep it possible. |
| `.nav` mesh occlusion for audibility | Revisit after Phase 5. Today's model is a named approximation and says so. |

---

## Worth knowing

- **The order is real.** M1 before M3 because a budget the shipped build misses outranks a screen
  that reads slightly wrong. M4's filter system is the largest unbuilt thing in the product and the
  one the mission statement depends on — it is P1 rather than P0 only because the review screen
  works without it.
- **"Blocked" mostly means "needs a demo we do not have."** #53, #58, #86 and #230 all wait on
  evidence rather than on work. If a Nuke demo or a shotgun round appears, three of them unblock
  the same afternoon.
- **An open issue can be older than the screen it names.** #116 and #118 are both in that state, and
  the redesign will age more of them. Check the code before starting a row here.
- **There is no design document any more.** It was deleted on 1 September 2026 along with the system
  it described, deliberately. What replaced it is the token layer's own comments, which state their
  measured numbers, and the issue bodies of M3.5. A screen decision is recorded in the PR that makes
  it.
- **Sizes here are not commitments.** They are what an issue of this shape has cost so far in this
  repository, which is one PR per issue and a squash merge.
