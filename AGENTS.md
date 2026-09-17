# AGENTS.md — disalytics

> **The single source of truth for how this project works**, for humans and every agent. `CLAUDE.md`
> only imports it and adds Claude Code specifics — never duplicate between them. Section numbers are
> stable (code cites them). *Why* lives in the PR (`gh pr view <N>`), not here. Stay under 300 lines.
>
> Companions: `CONTRIBUTING.md` (issue → PR loop, labels) · `CODE_REQUIREMENTS.md` (style, layering,
> i18n patterns) · `packages/ui/src/styles/tokens.css` (visual system) · `docs/PARSER.md` (parser) ·
> `vendor/README.md` (every deviation from upstream).

## 1. Mission

**disalytics** is a fully client-side PWA for reviewing Counter-Strike 2 replays (`.dem`), in English
and Russian, live at https://disalytics.disa-67b.workers.dev. It turns a 40-minute match into a
~10-minute review.

- **Review, not frame-perfect replay** — favour smoothness, label approximations in the UI.
- **Game-agnostic name** — nothing outside `crates/demo-parser` assumes "CS2".

**What ships:** way in (upload, library, samples, dock) · review stage (plate, team cards, feed, round
strip and axis, transport) · match views (`V`): scoreboard, duels, heat map, utility, metrics "Soon" ·
settings and help sheets · offline shell, update prompt, OS file handling.

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
.dem → packages/demo-parser (worker) → crates/demo-parser-wasm → crates/demo-parser → vendor/
     → core/parsing → packages/demo-store (cache) → features/review → radar · timeline · controls
```

| Path | Owns |
|---|---|
| `packages/demo-core` | schema, `SCHEMA_VERSION`, clock, game rules and derivations — pure TS |
| `packages/demo-parser` | worker protocol and client; `src/wasm-glue.d.ts` is hand-written |
| `packages/demo-store` | OPFS/IndexedDB cache, catalog, container codec (`@disa/demo-store/codec`) |
| `packages/map-data` | overview constants, world→radar transform, themed radar images |
| `packages/i18n` · `packages/ui` | locales + typed keys + `<Text>`/`useT` · components, tokens, motion |
| `apps/web/src/core` | playback, renderer, shortcuts, settings, parsing, events, glyphs, motion, pwa, samples |
| `apps/web/src/features` | library (way in), review (stage + views), radar, timeline, controls |
| `crates/demo-parser` · `-wasm` | Rust core (no wasm-bindgen, forbid unsafe) · thin wrapper → `pkg/` (gitignored) |
| `vendor/` · `tools/` | upstream parser, pinned and patched · `scripts/` behind `bun run`, `probes/` |

Packages are `@disa/<folder>`. Vite aliases `demo-parser-wasm` to `crates/demo-parser-wasm/pkg/`, so
**`bun run build` needs a built `pkg/`**. `crates/demo-parser` must pass plain `cargo test`.

## 5. Commands

```bash
bun run dev | build | preview       # vite :5173 · tsc + vite build (needs pkg/) · wrangler dev :8787
bun run typecheck | check | test    # tsc via turbo + tools · biome (check:fix) · vitest
bun run i18n:check                  # en/ru parity, no unread keys; regenerates the key union
bun run errors:check | bitfields:check   # ErrorCode / FLAG_*·GRENADE_* parity with the crate
bun run contrast:check              # contrast figures stated in tokens.css still measure true
bun run tokens:check                # every class and var(--…) exists in built CSS (build first)
bun run samples:check | reel:check  # committed samples match SCHEMA_VERSION · reel regenerates
bun run size [--wasm]               # budgets (§16) — on a --force clean build
bun run wasm:build | wasm:smoke     # wasm-pack → pkg/ · call into the binary (+DISALYTICS_FIXTURE_DEMO)
bun run mapdata:generate | icons:generate   # map data + radar themes · weapon/equipment outlines
bun run samples:generate | reel:generate    # samples from DISALYTICS_SAMPLE_DIR · way-in reel
bun run smoke <url>                 # deploy contract (§13)
bun run repo:labels | repo:milestones   # sync GitHub labels and milestones
cargo test -p demo-parser           # parser core; DISALYTICS_FIXTURE_DEMO runs the fixture test
```

## 6. Data Architecture

### 6.1 The memory math

154k ticks × 10 players × ~25 bytes ≈ 39 MB; sampled at **16 Hz** ≈ 10 MB. Data fits in RAM; millions
of JS objects would not. **`tick` ≠ `frame`**: a tick is a demo tick (64/s), a frame a sample index —
a variable named `tick` holding a frame is a bug.

### 6.2 The rule that follows

`TickTrack` (`demo-core/src/schema.ts`): `posX/Y/Z`, `yaw/pitch` (°×100), `health`, `flags`, `armour`,
`weapon` (index into `MatchHeader.weapons`, 255 = none), `grenades`, `speed`, `money`. Index is
`frame * slotCount + slot`. Rust writes the buffers, transferred once. Never allocate per frame.

### 6.3 Events are different — objects are correct there

Plain arrays sorted by tick, found with `lastIndexAtOrBefore` plus a walk bounded by the window.

### 6.4 Storage tiers

- RAM for scrub and draw; OPFS/IndexedDB hold one container per demo keyed
  `${fingerprint}:${SCHEMA_VERSION}`; localStorage holds `disa.*` preferences only.
- Storage is a cache, never a hot path. The key fingerprints first + last MiB, length and mtime.
- A missing tier, an undecodable container or a vanished file is a **miss**, never an error.
- Eviction: 512 MB LRU (`catalog.ts`); reads never write recency; metadata is written at store time.
- A `SCHEMA_VERSION` bump drops every cache entry and needs `samples:generate` + `reel:generate` in
  the same PR. `storage.persist()` returning `false` is normal.

## 7. Parsing Pipeline

### 7.1 Input

`.dem` · `.dem.zst` (FACEIT, `ruzstd`) · `.dem.bz2` (Valve, `bzip2` 0.6 Rust backend), by magic bytes;
decompression lives in the crate. `.dem.gz` → `UNSUPPORTED_CONTAINER`. Bad input ends in an error
screen, never a crash.

### 7.2 Memory model

The decompressed demo sits in WASM linear memory, streamed in by chunks. **Two passes** — events +
ticks, then projectiles (`docs/PARSER.md` §25). Peak ≈ 900 MiB.

### 7.3 Worker protocol

`packages/demo-parser/src/protocol.ts`: `progress {phase, percent}` → `header` → `done {track,
events}` (transferred) or `error {code}`. Cancellation is `terminate()` — a trapped instance is
poisoned, so one worker per parse. `ErrorCode` mirrors `crates/demo-parser/src/error.rs`.

## 8. Playback Engine

- `Clock { frame, isPlaying, speed, scrub }` is a plain mutable object; `scrub` is a held arrow's
  temporary rate, separate from the chosen `speed`.
- The transport has **two channels**: *frames* (drawing only, never React) and *transport*
  (`useSyncExternalStore`). One rAF loop while playing, capped at `MAX_FRAME_MS`, reset on
  `visibilitychange`. Readouts poll at **10 Hz**.
- Positions interpolate; > 2000 u/s or through a death snaps. The scrubber is an **uncontrolled**
  range input scoped to the current round (`min`/`max` are that round's frames).
- **Sides follow the round, never the roster** — `sidesBySlotAtRound` reads `Round.economy[].team`;
  `PlayerInfo.team` is the end-of-match side. Teams are named by opening side (`openingSideBySlot`).
- Never walk events in a draw or a 10 Hz render; derive per demo or round. `memo` on `RoundOutcomes`
  and `EventGlyphs` was measured to save frames — not reflex.
- **Settings**: one store, one key per setting, read where obeyed (`core/settings`); palette and motion
  override are document attributes written outside React.
- Keys: space, `,`/`.` step, `[`/`]` round, `←`/`→` seek/scrub, `1`–`0` players, `+`/`−` zoom, `V`
  views. Help is generated from `SHORTCUT_BINDINGS`; bindings suspend under a sheet and skip
  `defaultPrevented` events.

## 9. Radar Rendering

`core/renderer` is CS2-agnostic canvas plumbing; `features/radar` knows maps, sides and players.

- Transform from Valve overviews: `radarX = (worldX − pos_x) / scale`, `radarY = (pos_y − worldY) /
  scale` on 1024². Themes `vanilla`/`blue`/`cyber` are data + a ramp, generated byte-stably; images
  are unhashed assets under `/radar/`, never imported into JS.
- **Nothing allocates in a draw**: scratch buffers, text widths once per demo after `useFontReady`,
  `Path2D` once, per-slot helpers write into the caller's typed array.
- **Everything on the plate is a function of match time**, so scrubbing backwards replays it.
- Labels move, tokens don't (`labelPlacer`, 12 boxes, leader line when displaced). Selection is React
  state set from a team-card row, never a canvas hit test.
- **The plate is `min(100cqi,100cqb)` of a grid cell no card is in** — a new grid row shrinks the
  map, which is why the view switch is out of flow. Zoom 1–4× lives in `helpers/view.ts`.
- Utility bodies, audibility and tracer length are **named approximations**, labelled as such.

## 10. Event Schema

`packages/demo-core/src/schema.ts` is the source of truth; any shape change bumps `SCHEMA_VERSION`
(now **8**) — ask first. Kills · Damage (raw, unclamped) · Shots (weapon index, exact yaw) · Grenades
(throw/detonation/expiry, trajectory, landing) · Blinds · Objectives (site entity, detonation tick) ·
Rounds (reason, freeze end, length) · Economy (including **the side held that round**). Display
(`AK-47`) and internal (`ak47`) weapon names differ — bridge with `ENTRY_BY_INTERNAL_NAME` (#53).
Audibility is free-field ("ignoring walls").

## 11. Internationalisation

One JSON per namespace per locale; a namespace is a slice, not a screen; only the active locale loads.
Keys are typed. **Game vocabulary is never translated** (weapons, maps, callouts, `eco`, `clutch`) —
it lives in `demo-core`. `Intl` for numbers and dates; ICU plurals with **four Russian forms**; one key
per whole sentence. Locale: stored → `navigator.language` → `en`. Use the `i18n-key` skill.

## 12. PWA

`file_handlers` on `/open` → `useLaunchedFiles` → the same `open` as a drop. `sw.ts` precaches
`**/*.{html,css,js}`, routes navigations to `index.html`; `useWorkerUpdate` waits for the reader's press.

## 13. Hosting — Cloudflare Workers (static assets)

Assets-only Worker (`wrangler.jsonc`, no `main`, SPA fallback, `preview_urls: false`). `/assets/*`
immutable, `index.html` and `/radar/*` revalidate, `.wasm` is `application/wasm`, **never COOP/COEP**,
keep `.assetsignore`. `bun run smoke <url>` asserts all of it from the deployed page.

## 14. Contribution Flow

`issue → gh issue develop <N> --checkout --base main → PR (Closes #N) → CI green → squash merge`.

- No issue, no branch; one PR per issue; never push to `main`; `--auto` is refused — wait for `CLEAN`.
- Titles are conventional commits, scope = `area:` label. Every issue has `type:`, `area:`, `phase:`,
  `priority:`, `size:` and a milestone; `size:xl` is split before a branch (`CONTRIBUTING.md` §3).
- Docs and small fixes ride in the feature PR that motivates them. Aim for zero comments; no `TODO`.
- Open a draft PR early. Run focused checks while editing; required CI is the full gate.
- Lefthook gives fast feedback only: Biome on staged files and `cargo fmt --check` for staged Rust.

## 15. CI/CD — GitHub Actions

`ci.yml`: typecheck, check, the parity/contrast/samples/reel checks, test, build (restoring `pkg/` from
the parser cache), tokens:check, size. `wasm.yml`: fmt, clippy, cargo test, wasm build + smoke,
`size --wasm`; caches `pkg/` keyed on parser *sources*. `deploy.yml`: on green `ci`/`wasm`, deploys
`head_sha`, runs `smoke`, records a deployment. Required checks use a `scope` job instead of path
filters. Previews are off (#33).

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
3 × 399 frames per arm plus a same-hour `main` baseline; count frames over 16.7 ms. **Bundle:**
`rm -rf apps/web/dist && bun run build --force` first.

**Hard constraints:** 25 MiB per static file · no COOP/COEP, so no WASM threads · two upstream passes ·
a background tab parses ~5× slower · `storage.persist()` may be refused · `launchQueue` is Chromium
desktop only. **Chosen:** 16 Hz sampling · no light theme · achromatic chrome · `backdrop-filter`
only on full-screen sheets · no multi-demo comparison in v1.

## 17. Design

No design document: `packages/ui/src/styles/tokens.css` and its siblings are the system, with measured
contrast figures (`contrast:check`). Comments citing `DESIGN.md` or `ROADMAP.md` point at deleted
files; the behaviour they describe is current. Near-black ground, white hairlines, Onest plus IBM Plex
Mono, **chroma reserved for data**.

1. The frame budget is the only motion constraint; canvas changes follow `clock.frame`.
2. `backdrop-filter` only on full-screen sheets and the dialog scrim.
3. Numbers use tabular figures (Plex Mono, `tabular-nums`).
4. Colour means something the demo said; interaction is luminance; side identity never rests on hue
   alone. Palettes: default, colour-blind, cyber.
5. Reduced motion is honoured everywhere, WebGL included.
6. Layouts are designed against Russian (15–30% longer); no fixed-width labels.
7. Empty, progress and error states are designed screens. Keyboard first; pointer is the fallback.
8. **`border-t` is not a top border** (`--color-t` owns that namespace) — use
   `[border-block-start:1px_solid_var(--color-line)]`.
9. Tailwind v4's `translate-*`/`scale-*` set individual properties, so `transition-[transform]` does
   not animate them — use the utility. A `motion` component never receives Base UI's composite ref.

**Measuring a screen:** quote plate sizes with the viewport height (stage 716 at 1440×900, 473 at
1024×800). Overflow sweeps walk `document.querySelectorAll('*')`, follow ancestors for clipping, skip
`sr-only`, absolutely positioned marks and `display: contents` parents.

## 18. Definition of Done

1. Required `ci` and `wasm` checks pass; do not repeat their full suites locally
2. Focused tests pass while editing; `i18n:check` regenerates typed keys when locale files change
3. New `demo-core` logic has unit tests
4. No §16 budget regressed — measured when the change is on the frame path
5. No new runtime dependency without approval
6. Docs describing changed behaviour are updated in the same PR

Never commit or publish a `.dem`. `DISALYTICS_FIXTURE_DEMO` names a local demo (otherwise the fixture
test skips); `DISALYTICS_UPDATE_SNAPSHOT=1` rewrites the golden snapshot for human review. The shipped
samples are parses of a public professional match — the only review screen fit for a screenshot.

## 19. Roadmap

Phases 0–4 and the redesign are done, Phase 5 is in progress; #53, #58, #86, #230 wait on demo data.
**What is next lives in GitHub, not in a file:** milestones *Polish* → *Match views* → *Toolbox* →
*Coaching* → *Lineups* → *Player profiles*. Queue: `gh issue list --milestone Polish --label priority:p1`.

## 20. Decisions and Open Questions

Decided choices are §3, §16 and §17. **Open:** a cheap header read · `.nav` occlusion · Tauri · #53.

## 21. When You Are Unsure

Ask rather than guess if a task would: add a runtime dependency or noticeably grow the bundle ·
introduce async I/O into a scrub or render path · change the schema or `SCHEMA_VERSION` · require
anything server-side · exceed a §16 budget · move `clock.frame` into a reactive store · add
`wasm-bindgen` to `crates/demo-parser` · hardcode a user-facing string or translate game vocabulary.
