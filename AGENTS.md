# AGENTS.md — disalytics

> Operating contract for anyone changing this repository. If a request conflicts with the **Hard
> Rules** (§2), stop and ask. Section numbers are stable — code cites them (`AGENTS.md §16`), so keep
> a section's number when rewriting it. *Why* a decision was made lives in the PR that made it.
>
> Companions: `CONTRIBUTING.md` (issue → PR loop, labels) · `CODE_REQUIREMENTS.md` (style, layering,
> i18n patterns) · `packages/ui/src/styles/tokens.css` (visual system) · `docs/PARSER.md` (parser) ·
> `vendor/README.md` (every deviation from upstream).

## 1. Mission

**disalytics** is a fully client-side PWA for reviewing Counter-Strike 2 replays (`.dem`), in English
and Russian. It turns a 40-minute match into a ~10-minute review: a round timeline, a 2D radar and
whole-match views (scoreboard, duels, heat map, utility).

- **Review, not frame-perfect replay.** When accuracy and smoothness conflict, favour smoothness and
  label the approximation in the UI.
- **Game-agnostic name.** Nothing outside `crates/demo-parser` assumes "CS2".

## 2. Hard Rules

Violating one is a bug, not a trade-off.

1. **No server ever touches a `.dem`** — no uploads, no demo bytes in any request. Works offline.
2. **Parsing runs in a Web Worker.** The main thread never opens, decompresses or parses a demo.
3. **Per-tick data is columnar typed arrays**, never arrays of objects (§6). Events are the opposite.
4. **`clock.frame` never lives in React state or a reactive store**; nothing on the frame channel
   writes into React (§8).
5. **No `localStorage`/`sessionStorage` for parsed data.** OPFS, then IndexedDB. Preferences are fine.
6. **No `any`**, no `!`, no silencing `as`, no `@ts-expect-error` without a comment and an issue.
7. **No hardcoded user-facing string** — i18n, `en` and `ru` together (§11). `demo-core` and the
   parser emit `{ key, params }` or codes, never prose.
8. **Parsing is deterministic** — same bytes + same `SCHEMA_VERSION` → byte-identical output.
9. **Playback and scrub hold 60 fps, and that is the whole rule.** No property or moment is banned;
   canvas changes are functions of `clock.frame`. §16 enforces it; when it fails, the motion goes.
10. **New runtime dependencies need human approval.** Bundle size is a product constraint.
11. **`packages/demo-core` is platform-agnostic** — no DOM, React, browser APIs, I/O or `@/` alias.
12. **`crates/demo-parser` has no `wasm-bindgen`, `js-sys` or `web-sys`** — native builds stay possible.
13. **Dependencies point one way** — `apps → packages`; in the app `features → core → shared`. Never
    sideways between features, never upward. Import barrels, not deep paths.

## 3. Stack

Bun 1.3+ and Turborepo · React 19 SPA on Vite, TypeScript `strict` · Biome · Tailwind v4 over
`tokens.css`, shadcn/ui + animate-ui **copied** into `packages/ui` on Base UI · `motion` through one
`MotionProvider` (write `motion.*`) · react-intl with generated typed keys · Canvas 2D (`ogl` only for
the way-in background) · Rust parser (upstream `demoparser`, vendored) via wasm-pack · OPFS +
IndexedDB · Vitest (node environment) and `cargo test` · `vite-plugin-pwa` (`injectManifest`) ·
Cloudflare Workers static assets. No Zustand: the playback transport is the store.

**Rejected:** Go (15–25 MB WASM), signals, `SharedArrayBuffer`, react-three-fiber, Tauri for now.

## 4. Repository Layout

```
apps/web/            SPA — src/features (library, review, radar, timeline, controls)
                           src/core (playback, renderer, shortcuts, settings, parsing, events,
                                     glyphs, motion, pwa, samples)   src/shared
packages/demo-core   schema, clock, game rules, derivations — pure TS
packages/demo-parser worker, protocol, client (hand-written wasm-glue.d.ts)
packages/demo-store  OPFS/IndexedDB cache, catalog, container codec
packages/map-data    overview constants, world→radar transform, themed radar images
packages/i18n        locale JSON per namespace, typed keys, <Text>, useT
packages/ui          components, tokens.css, motion provider
crates/demo-parser   Rust core (forbid unsafe, no wasm-bindgen) · crates/demo-parser-wasm → pkg/
vendor/              upstream parser, pinned and patched
tools/scripts        checks and generators behind `bun run` · tools/probes — Phase 0 probes
```

`crates/demo-parser` must build and test with plain `cargo test`. Layering rules for `apps/web/src`
are in `CODE_REQUIREMENTS.md` §1–§2.

## 5. Commands

Listed with one line each in `CLAUDE.md` → Commands; CI's order is in §15.

## 6. Data Architecture

### 6.1 The memory math

A 40-minute match at 64 tick ≈ 154k ticks × 10 players × ~25 bytes ≈ 39 MB; sampled at **16 Hz** with
interpolation ≈ 10 MB. The data fits in RAM; millions of JS objects would not.

### 6.2 The rule that follows

`TickTrack` (`demo-core/src/schema.ts`) is columnar — `posX/Y/Z`, `yaw/pitch` (°×100), `health`,
`flags` (alive, ducking, scoped, defusing, planting, walking, helmet), `armour`, `weapon` (index into
`MatchHeader.weapons`, 255 = none), `grenades` (bitfield), `speed`, `money`. Index is always
`frame * slotCount + slot`. Rust writes the buffers; they are transferred once. Never allocate per frame.

### 6.3 Events are different — objects are correct there

A few thousand events per match: plain arrays sorted by tick, found with `lastIndexAtOrBefore` and a
walk back bounded by the window, not by the match.

### 6.4 Storage tiers

- **RAM** holds the parse for scrub and draw. **OPFS/IndexedDB** hold one container per demo keyed
  `${fingerprint}:${SCHEMA_VERSION}`. **localStorage** holds `disa.*` preferences only.
- Storage is a cache, never a hot path — no `await` on storage in a scrub or render path.
- The key is a fingerprint (first + last MiB, length, mtime), not a content hash; a renamed file is
  the same demo.
- A missing tier, an undecodable container or a vanished file is a **miss**, never an error.
- Eviction: 512 MB LRU in `catalog.ts`. A read never writes recency; metadata is written at store time.
- A `SCHEMA_VERSION` bump discards every cached entry and requires `samples:generate` and
  `reel:generate` in the same PR. `storage.persist()` returning `false` is normal.

## 7. Parsing Pipeline

### 7.1 Input

`.dem` as is · `.dem.zst` (FACEIT) via `ruzstd`, looping over frames · `.dem.bz2` (Valve) via `bzip2`
0.6's Rust backend. Detected by magic bytes. Decompression lives in the crate: no JS dependency, one
copy, native reuse. `.dem.gz` → `UNSUPPORTED_CONTAINER`. POV, truncated, CS:GO and non-demo files end
in an error screen, never a crash.

### 7.2 Memory model

The decompressed demo sits in WASM linear memory, streamed in chunk by chunk (never held twice). The
parse is **two passes** — events + tick columns, then projectiles (`docs/PARSER.md` §25). Peak ≈ 900 MiB.

### 7.3 Worker protocol

`packages/demo-parser/src/protocol.ts` is binding: `progress {phase, percent}` → `header` →
`done {track, events}` (buffers transferred) or `error {code}`. Input is `File | FileSystemFileHandle`.
Cancellation is `terminate()` — a trapped WASM instance is poisoned, so a worker serves one parse.
`percent` is the parser's byte position, each pass an equal share. `ErrorCode` mirrors
`crates/demo-parser/src/error.rs` (`errors:check`).

## 8. Playback Engine

- `Clock { frame, isPlaying, speed, scrub }` is a plain mutable object in `demo-core`; `frame` sits
  between samples. `scrub` is a held arrow's temporary rate, kept apart from the chosen `speed`.
- `core/playback`'s transport has **two channels**: *frames* (drawing only, never React) and
  *transport* (play/pause/speed via `useSyncExternalStore`). One rAF loop runs only while playing,
  capped at `MAX_FRAME_MS`, reset on `visibilitychange`.
- Readouts poll at **10 Hz**. Positions interpolate; > 2000 u/s or through a death snaps.
- The scrubber is an **uncontrolled** range input scoped to the current round; the playhead moves by
  `transform`.
- **Sides follow the round, never the roster**: `sidesBySlotAtRound` reads `Round.economy[].team`;
  `PlayerInfo.team` is the end-of-match side. Teams are named by their opening side.
- Never walk an event array in a draw or a 10 Hz render — derive per demo or per round. Lists
  re-rendered at 10 Hz are `memo`'d because not doing so measurably cost frames.
- Keys: space, `,`/`.` step, `[`/`]` round, `←`/`→` seek on tap and scrub on hold, `1`–`0` players,
  `+`/`−` zoom, `V` views. Help is generated from `SHORTCUT_BINDINGS`; bindings suspend under a sheet.

## 9. Radar Rendering

`core/renderer` is CS2-agnostic canvas plumbing; `features/radar` knows maps, sides and players.

- **Transform** from Valve overviews: `radarX = (worldX − pos_x) / scale`, `radarY = (pos_y − worldY) /
  scale` on 1024². `mapdata:generate` builds it from committed assets; the debug overlay verifies only.
- **Themes** (`vanilla`, `blue`, `cyber`) are data plus a ramp, generated byte-stably. Radar images are
  unhashed static assets under `/radar/`, never imported into JS.
- **Nothing allocates in a draw**: layers own scratch buffers, label widths are measured once per demo
  after `useFontReady`, `Path2D`s compile once, per-slot helpers write into the caller's typed array.
- **Everything on the plate is a function of match time**, so scrubbing backwards replays it.
- **Labels move, tokens don't**: `labelPlacer` tries 12 boxes; a displaced label gets a leader line.
- **Selection is React state set from a team-card row**, not a canvas hit test (keyboard first).
- Zoom 1–4× and pan live in a mutable box (`helpers/view.ts`); zoomed, the plate spans the stage.
- Utility bodies, audibility and tracer length are **named approximations**, labelled as such.

## 10. Event Schema

`packages/demo-core/src/schema.ts` is the single source of truth; any shape change bumps
`SCHEMA_VERSION` (now **8**) — ask first.

Kills (attacker, victim, assister, weapon, headshot, wallbang, smoke, no-scope, blind, distance) ·
Damage (raw health/armour damage, hitgroup) · Shots (weapon index, exact yaw) · Grenades (thrower,
type, throw/detonation/expiry ticks, trajectory, landing) · Blinds (per player, duration) · Objectives
(plant with site entity and detonation tick, defuse start/complete/abort) · Rounds (winner, reason,
freeze end, round length) · Economy (per round and slot, including **the side held that round**).
Weapon vocabularies differ (display vs internal names) — `ENTRY_BY_INTERNAL_NAME` bridges them (#53).
Audibility is free-field ("ignoring walls"); occlusion is not claimed.

## 11. Internationalisation

`packages/i18n` holds one JSON per namespace per locale; a namespace is a slice, not a screen. Only the
active locale loads. Keys are typed and `i18n:check` fails on missing, orphaned or unread keys. **Game
vocabulary is never translated** (weapons, maps, callouts, `eco`, `clutch`) and lives in `demo-core`.
Numbers and dates via `Intl`; ICU plurals with **four Russian forms**; one key per whole sentence.
Locale: stored preference → `navigator.language` → `en`.

## 12. PWA

`file_handlers` for `.dem`/`.dem.zst`/`.dem.bz2` on `/open` with `focus-existing`; `useLaunchedFiles`
hands `launchQueue` files to the same `open` a drop uses. `sw.ts` precaches `**/*.{html,css,js}` and
serves every navigation from `index.html`; WASM, fonts and samples are not precached.
`useWorkerUpdate` registers in production; a new worker waits for the reader's press on the way-in
notice, then every tab reloads.

## 13. Hosting — Cloudflare Workers (static assets)

**https://disalytics.disa-67b.workers.dev** — assets-only Worker (`wrangler.jsonc`, no `main`, SPA
fallback, `preview_urls: false`). `_headers` makes `/assets/*` immutable; `index.html` and `/radar/*`
revalidate. `.wasm` must be `application/wasm`; **never set COOP/COEP**; keep `.assetsignore`. Limits:
25 MiB per file, 20k files. `bun run smoke <url>` asserts all of it, finding hashed paths by walking
the deployed page.

## 14. Contribution Flow

`issue → branch (gh issue develop) → PR (Closes #N) → CI green → squash merge`. No issue, no branch;
one PR per issue; never push to `main`. Details in `CONTRIBUTING.md`.

## 15. CI/CD — GitHub Actions

- **`ci.yml`** — typecheck, check, i18n/errors/bitfields/contrast/samples/reel checks, test, build
  (restoring `pkg/` from the parser cache), tokens:check, size.
- **`wasm.yml`** — fmt, clippy `-D warnings`, `cargo test`, `wasm:build`, `wasm:smoke`, `size --wasm`;
  writes `pkg/` to a cache keyed on parser *sources* (never `crates/**`, which contains `pkg/`).
- **`deploy.yml`** — `workflow_run` on `ci` and `wasm`; deploys `head_sha`, runs `smoke`, records a
  GitHub deployment, refuses forks.
- `ci` and `wasm` are required checks. PRs have no path filter — a `scope` job skips the real job by
  `if:` (a path-skipped workflow never reports). Previews are off since #33.

## 16. Performance Budgets

A regression is a blocker. Method and history live in the PR that measured each figure.

| Metric | Budget | Latest |
|---|---|---|
| Parse a 300 MB demo | < 15 s | 13.45 s — 264 MB `.dem.zst`, built bundle (#355) |
| Peak memory during parse | < 1.5 GB | 897 MiB linear memory (tab memory needs COOP/COEP) |
| Scrub / review screen playing, everything on | 60 fps | 0 frames > 16.7 ms in 3 × 399 |
| Cached demo reopen | < 3 s | 0.02 s |
| JS bundle excl. WASM, one locale | < 500 kB gzip | 293.14 kB (#374) |
| WASM binary | < 4 MB (CI fails > 24 MB) | 2.66 MB, `-O3` |

**Frames:** headed Chrome over CDP, built bundle, 1440×900, `visibilityState` asserted in the run,
3 passes × 399 frames per arm plus a `main` baseline the same hour. Count frames over 16.7 ms; one worst
frame is noise. The in-app browser pane cannot measure frames. **Bundle:** measure on
`rm -rf apps/web/dist && bun run build --force`, or turbo hands `size` a stale `dist`.

**Hard constraints:** 25 MiB per static file · no COOP/COEP, so no WASM threads · upstream needs two
passes · a background tab parses ~5× slower · `storage.persist()` may be refused · `launchQueue` is
Chromium desktop only. **Chosen:** 16 Hz sampling (detail windows before a higher rate) · no light
theme · achromatic chrome · `backdrop-filter` only on full-screen sheets · no multi-demo comparison in v1.

## 17. Design

No design document: `packages/ui/src/styles/tokens.css` and its sibling stylesheets are the system,
with measured contrast figures in comments (`contrast:check`). Comments citing `DESIGN.md` or
`ROADMAP.md` point at deleted files; the behaviour they describe is current.

Near-black ground, white hairlines, Onest (Cyrillic) plus IBM Plex Mono, **chroma reserved for data**.

1. The frame budget is the only motion constraint.
2. Canvas changes are functions of `clock.frame`: match time draws, wall time animates.
3. `backdrop-filter` only on full-screen sheets and the dialog scrim.
4. Numbers use tabular figures.
5. Colour means something the demo said; interaction is luminance. Palettes: default, colour-blind,
   cyber. Side identity never rests on hue alone.
6. Reduced motion is honoured everywhere, WebGL included.
7. Layouts are designed against Russian (15–30% longer); no fixed-width labels.
8. Empty, progress and error states are designed screens.
9. Keyboard first; the pointer is the fallback.

**Measuring a screen:** quote plate sizes with the viewport height (stage: 716 at 1440×900, 473 at
1024×800). An overflow sweep walks `document.querySelectorAll('*')`, follows ancestors for clipping,
and skips `sr-only`, absolutely positioned marks and `display: contents` parents.

## 18. Definition of Done

1. `typecheck`, `check` (no new suppressions), `test`, and `cargo test` for crates pass
2. `i18n:check`, `contrast:check`, and `tokens:check` on a branch-built `dist` pass
3. New `demo-core` logic has unit tests
4. No §16 budget regressed — measured when the change is on the frame path
5. No new runtime dependency without approval
6. Docs describing changed behaviour are updated in the same PR

Never commit or publish a `.dem` (real names and SteamIDs). `DISALYTICS_FIXTURE_DEMO` names a local
demo, otherwise the fixture test skips; `DISALYTICS_UPDATE_SNAPSHOT=1` rewrites the golden snapshot for
human review. The shipped samples are parses of a public professional match.

## 19. Roadmap

Phases 0–4 and the redesign are done, Phase 5 is in progress; #53, #58, #86, #230 wait on demo data.

**What is next lives in GitHub, not in a file.** Milestones *Polish* → *Match views* → *Toolbox* →
*Coaching* → *Lineups* → *Player profiles*; every issue carries `priority:*` and `size:*`
(`CONTRIBUTING.md` §3). Start from `gh issue list --milestone Polish --label priority:p1`.

## 20. Decisions and Open Questions

**Decided:** Rust parser, vendored · crate free of `wasm-bindgen` · decompression in the crate ·
Workers static assets · Canvas 2D · clock outside React · react-intl · `-O3` (time over size) · 16 Hz ·
no light theme · achromatic chrome · `ogl` for the way-in only · squash-only public repo.

**Open:** a cheap header read (`only_header` costs a full pass) · `.nav` occlusion for audibility ·
native Tauri parsing · canonical weapon vocabulary (#53).

## 21. When You Are Unsure

Ask rather than guess if a task would: add a runtime dependency or noticeably grow the bundle ·
introduce async I/O into a scrub or render path · change the schema or `SCHEMA_VERSION` · require
anything server-side · exceed a §16 budget · move `clock.frame` into a reactive store · add
`wasm-bindgen` to `crates/demo-parser` · hardcode a user-facing string or translate game vocabulary.
These are the decisions this document exists to protect.
