# AGENTS.md — disalytics

> Operating contract for AI agents working in this repository. Read fully before writing code.
> If a request conflicts with **Hard Rules** (§2), stop and ask the human instead of improvising.
>
> Companion documents — read the relevant one before working in that area:
> - `CONTRIBUTING.md` — issue/branch/PR workflow, labels, `gh` CLI commands
> - `CODE_REQUIREMENTS.md` — code style, structure, naming, comment policy, i18n patterns
> - `docs/DESIGN.md` — visual system, tokens, motion rules
> - `docs/PARSER.md` — parser internals and the WASM bridge (written during Phase 0)

---

## 1. Mission

**disalytics** — a fully client-side web application for analyzing Counter-Strike 2 match replays
(`.dem`), installable as a PWA, available in English and Russian. The product goal: compress a
40-minute match into a ~10-minute review through smart filtering, an interactive timeline, and
spatial insight on a 2D radar.

The name is deliberately game-agnostic. A future Counter-Strike release will mean a new demo format
and a new parser crate, but the product — timeline, radar, filters, audibility — survives that.
Nothing outside `crates/demo-parser` should encode "CS2" as an assumption.

**Product principle:** this is a tool for *review*, not frame-perfect replay. Where accuracy and
interaction smoothness conflict, favour smoothness and label the approximation in the UI.

---

## 2. Hard Rules

Violating any of these is a bug, not a trade-off.

1. **No server ever touches a `.dem` file.** No uploads, no network requests carrying demo data,
   no telemetry containing demo contents. The app works fully offline after first load.
2. **Parsing runs in a Web Worker.** The main thread never opens, decompresses, or parses a demo.
3. **Per-tick data lives in typed arrays (columnar / SoA), never arrays of objects.** See §6.
4. **`clock.frame` never lives in React state, Zustand, or signals.** See §8.
5. **No `localStorage` / `sessionStorage` for parsed data.** OPFS first, IndexedDB as fallback.
   (Small UI preferences — locale, theme — are fine there.)
6. **No `any`.** No `@ts-expect-error` without a comment explaining why and a linked issue.
7. **No user-facing string is hardcoded.** Every one goes through i18n. See §11. `demo-core` and
   the parser produce no display text at all — generated descriptions are emitted as
   `{ key, params }` data and rendered by the client.
8. **Parsing is deterministic.** Same demo bytes + same `SCHEMA_VERSION` → byte-identical output.
   The OPFS cache key and the golden snapshots both depend on it.
9. **No animation runs on the main thread during playback.** See §17.
10. **New runtime dependencies require human approval.** Bundle size is a product constraint.
11. **`packages/demo-core` stays platform-agnostic** — no DOM, no React, no browser-only APIs,
    no `@/` alias, no I/O.
12. **`crates/demo-parser` contains no `wasm-bindgen`.** Platform wrappers are thin and separate.
    This is what makes a native Tauri build possible later. See §4.
13. **Dependency direction is one-way** — `features → core → shared`, and `apps → packages`.
    Never sideways between features, never upward. See `CODE_REQUIREMENTS.md` §2.

---

## 3. Stack

| Area | Choice | Status |
|---|---|---|
| Package manager / script runner | **Bun** (1.2+, text `bun.lock`) | decided |
| Monorepo orchestration | Turborepo | decided |
| Framework | React 19, SPA, client-render only | decided |
| Language | TypeScript `strict`, Rust (parser) | decided |
| Bundler | Vite | decided |
| Lint + format | Biome | decided |
| Styling | Tailwind CSS + shadcn/ui | decided |
| i18n | **react-intl (FormatJS)**, typed keys | decided, see §11 |
| UI state | Zustand (discrete state only) | decided |
| Playback clock | plain mutable object + rAF — not a state library | decided |
| Radar rendering | Canvas 2D (PixiJS only if measurably needed) | decided, see §9 |
| Parser | **Rust — `demoparser2` (LaihoE) compiled with wasm-pack** | decided; adopted in #46, vendored and patched — see `vendor/README.md` |
| Persistence | OPFS, IndexedDB fallback | decided |
| Testing | Vitest + happy-dom | decided |
| PWA | `vite-plugin-pwa` in `injectManifest` mode | decided, see §12 |
| Hosting | Cloudflare Workers with static assets | decided, see §13 |
| CI/CD | GitHub Actions, public repository | decided |

### Why Rust, not Go

The Go route (`demoinfocs-golang`) has the more mature and complete event model, and that was its
whole case. Everything else favours Rust:

| | Go / demoinfocs | Rust / demoparser2 |
|---|---|---|
| WASM binary | ~15–25 MB | **~800 KB** (shipped in production by others) |
| Cloudflare 25 MiB asset cap | uncomfortably close | irrelevant |
| Memory control | GC inside WASM, linear memory never returned to OS | explicit, no GC |
| Browser track record | rare | multiple production CS2 analyzers ship it today |
| Tauri reuse later | none — Go WASM does not help a Rust desktop shell | same crate compiles native |
| JS bridge | `syscall/js`, awkward streaming `io.Reader` work | `wasm-bindgen`, well-trodden |

The binary size difference is roughly 20–30×, and it removes the single hardest constraint in the
whole plan. Combined with the fact that a Rust core crate compiles to *both* WASM and a native
Tauri build, this is not a close call.

**Phase 0 exists to confirm it, not to re-litigate it.** See §19 for the acceptance criteria.

### Rejected, with reasons

- **`@preact/signals-react`** — the high-frequency problem is solved by keeping the playback clock
  outside reactivity entirely (§8), leaving only human-speed state, where signals buy nothing. May
  be reconsidered *narrowly* for binding the clock readout to a text node, if profiling demands it.
- **`SharedArrayBuffer`** — would require COOP/COEP headers; transferring buffers once at end of
  parse is cheap enough that it buys nothing.
- **react-three-fiber** — see §9.
- **Tauri, for now** — the PWA (§12) covers installability and file association. Tauri is revisited
  after Phase 6, and §4 keeps the door open at zero cost.

---

## 4. Repository Layout

```
apps/
  web/                  # the SPA — the only app today
  api/                  # (future) Worker: accounts, shared review links
  landing/              # (future) marketing site
packages/
  demo-core/            # types, event schema, filters, analytics. Pure TS. No DOM, no React.
  demo-parser/          # TS side: worker, protocol types, wraps the wasm package
  demo-store/           # OPFS/IndexedDB cache, schema versioning, storage.persist()
  map-data/             # radar images, overview metadata, generated coordinate constants
  i18n/                 # locale resources, typed key union, <Text>, useT
  ui/                   # shared shadcn components + design tokens
  tsconfig/             # shared tsconfig bases
crates/
  demo-parser/          # core Rust. NO wasm-bindgen. Emits our columnar schema.
  demo-parser-wasm/     # thin wasm-bindgen wrapper -> pkg/, consumed by packages/demo-parser
  demo-parser-native/   # (future) thin wrapper for Tauri
vendor/                 # upstream demoparser, copied and patched. Read vendor/README.md first.
tools/
  scripts/              # codegen: overview files -> map-data; i18n key extraction (run with bun)
.github/
  workflows/            # ci.yml, wasm.yml, deploy.yml
  ISSUE_TEMPLATE/
docs/                   # DESIGN.md, PARSER.md, TOOLING.md
```

**Dependency direction is one-way:** `apps/*` → `packages/*`. Packages never import from apps.
`demo-core` imports nothing from the other packages.

**The inside of `apps/web/src` is layered `features → core → shared`** with its own rules about
barrels, slice ordering and what belongs in a package versus the app. That is specified in
`CODE_REQUIREMENTS.md` §1–§2 — read it before adding a folder.

**The crate split is load-bearing.** `crates/demo-parser` must compile and test on the host with
`cargo test`, with no WASM toolchain involved. Everything platform-specific lives in the wrapper
crates. This is what lets a Tauri build reuse the parser natively — with real threads and memory
mapping, which WASM cannot offer — instead of reimplementing it.

---

## 5. Commands

```bash
bun install                  # install workspace
bun run dev                  # dev server for apps/web
bun run build                # build all (turbo)
bun run check                # biome check — fails on lint/format issues
bun run check:fix            # biome check --write
bun run typecheck            # tsc --noEmit across workspace, then tools/scripts
bun run test                 # vitest run
bun run e2e                  # playwright
bun run wasm:build           # wasm-pack build crates/demo-parser-wasm
bun run wasm:smoke           # call into the built binary — proves it runs, not that it compiled
                             # DISALYTICS_FIXTURE_DEMO also checks the shape it hands to JavaScript
bun run mapdata:generate     # map constants from Valve overview files, plus the themed radars
bun run i18n:check           # fail on missing/orphaned keys, regenerate the key union
bun run errors:check         # fail when demo-core and the crate disagree about ErrorCode
bun run size                 # bundle + wasm sizes against budgets (§16)
bun run preview              # build, then serve apps/web/dist through wrangler dev
bun run smoke <url>          # assert the §13 deploy contract against a running URL

cargo test -p demo-parser    # core parser tests, no WASM toolchain needed
```

---

## 6. Data Architecture

### 6.1 The memory math

A 40-minute match at 64 tick ≈ 154k ticks. Per player per tick: position (3×f32 = 12 B) + view
angles (2×i16 = 4 B) + health/armour/flags/velocity (~8 B) ≈ 24 B. Ten players → ~240 B/tick →
**~37 MB for the whole match**. Sampling positions at **16 Hz** with interpolation on playback →
**~9 MB**.

**The whole match fits in RAM.** The OOM risk was never data volume — it is allocating 154k × 10
JavaScript objects, whose per-object overhead would cost 1.5–2 GB.

### 6.2 The rule that follows

```ts
interface TickTrack {
  tickRate: number;        // demo tick rate (64 / 128)
  sampleHz: number;        // positional sample rate, default 16
  frameCount: number;
  slotCount: number;       // 10 for 5v5
  posX: Float32Array;      // index = frame * slotCount + slot
  posY: Float32Array;
  posZ: Float32Array;
  yaw: Int16Array;         // degrees * 100
  pitch: Int16Array;
  health: Uint8Array;
  flags: Uint8Array;       // bitfield: alive, ducking, scoped, defusing, planting, walking
  speed: Uint16Array;      // units/sec, feeds the audibility model
}
```

Indexing is always `frame * slotCount + slot`. Never allocate per-frame objects in a loop.

The Rust side writes these buffers directly and hands them over as a single memory region — no
intermediate JSON, no per-tick object graph on either side of the boundary.

### 6.3 Events are different — objects are correct there

A match produces a few thousand discrete events. Store them as ordinary sorted arrays of objects
and binary-search by tick. **Do not** apply the columnar treatment to events. Knowing which of the
two shapes applies is part of the job.

### 6.4 Storage tiers

| Tier | Contents | Purpose |
|---|---|---|
| RAM (typed arrays) | full `TickTrack` + all events | synchronous access during scrubbing |
| OPFS | serialised parse result, key `${fileHash}:${SCHEMA_VERSION}` | skip re-parsing on revisit |
| IndexedDB | fallback when OPFS unavailable | — |
| localStorage | locale, theme, panel layout — nothing else | UI preferences |

**OPFS/IndexedDB is a cache, never a hot path.** Do not `await` a storage read inside a scrub or
render path. If you find yourself writing prefetch-and-cancel logic for the timeline, the
architecture has gone wrong — stop and ask.

Call `navigator.storage.persist()` after the first successful parse, or the browser may evict the
cache and silently undo the whole benefit.

`SCHEMA_VERSION` is a constant in `demo-core`. Bump it on any change to parsed output shape;
mismatched cache entries are discarded, not migrated.

### What `packages/demo-store` actually built — #51

**The key is a fingerprint, not a content hash, and the table above says `fileHash` because that is
what it is keyed on rather than what it covers.** `crypto.subtle.digest` has no streaming form, so
hashing a 353 MB demo whole would put the file in the JavaScript heap — the exact allocation
`packages/demo-parser` streams to avoid — and would spend a large part of the three-second budget
below on every hit. The digest covers **the first and last mebibyte, the byte length and the
modification time**. A collision needs two recordings of the same length, modified in the same
millisecond, identical at both ends and different only in between; the trade is asserted by a test
rather than described. The file's *name* is deliberately outside the digest: a renamed demo is not
a different demo.

**A cached demo is one container file.** A twelve-byte prefix — magic, format version, meta
length — then a JSON meta block, then every typed array end to end, referenced from the meta by
index. Encoding hands the parser's own buffers to the backend unchanged, so a demo is never copied
into a second contiguous allocation on the way to disk. The format is versioned separately from
`SCHEMA_VERSION`: that number moves when the data changes, this one when the bytes around it do.
The encoder is byte-stable, which is what makes hard rule 8 load-bearing rather than decorative.

**Eviction is written at the code**, in `packages/demo-store/src/catalog.ts`: 512 MB of demos, least
recently used evicted first, never the entry being written, entries under another `SCHEMA_VERSION`
and files no catalog entry claims both dropped on open. Recency lives in memory for the session and
is flushed when a demo is stored — a read never writes, because eviction can only happen on a write.

**A tier that is missing is not an error.** No OPFS, no IndexedDB, or no Web Crypto to key with, and
`openDemoStore()` answers `null`; the app parses every time and the summary screen says so. The
same is true of a container that will not decode: it is a miss, and the entry is dropped.

`navigator.storage.persist()` is requested after the first successful store and its answer reaches
the screen. **Chrome declines it on a site with no engagement and no installation, so `best-effort`
is the ordinary answer rather than the exceptional one** — the copy says the demo is saved and the
browser may still clear it, instead of promising something the browser did not grant.

---

## 7. Parsing Pipeline

### 7.1 Input

| Container | Source | Decoder |
|---|---|---|
| `.dem` | already extracted | none |
| `.dem.zst` | FACEIT — the only container it serves | `ruzstd` |
| `.dem.bz2` | Valve matchmaking | `bzip2` (Rust backend) |

`DecompressionStream` covers only `gzip`, `deflate` and `deflate-raw`, so neither compressed
container has a platform path in the browser. **Decompression lives in `crates/demo-parser` behind
pure-Rust decoders**, and the container is identified from magic bytes, not the file extension — a
renamed file still parses.

That placement is the whole point:

- no new frontend runtime dependency (hard rule 10), nothing spent from the JS bundle budget (§16)
- the decompressed bytes appear where the parser already needs them, so the file never crosses the
  JS→WASM boundary twice — directly relevant to the peak-memory question in §7.2
- the same code path serves a native Tauri build
- pure Rust keeps a C toolchain out of the wasm build. `zstd` is C bindings and stays rejected;
  **`bzip2` is not, since 0.6** — its default backend is `libbz2-rs-sys`, a Rust rewrite, which is
  why the table names it rather than the `bzip2-rs` crate this section named until #48. That
  decision and its numbers are in `docs/PARSER.md` §15. `#![forbid(unsafe_code)]` on
  `crates/demo-parser` is unaffected by either: it covers this crate, never its dependencies.

`.dem.gz` is not a supported input — FACEIT no longer serves it (verified 2026-07-30 on Windows and
macOS). Add it back only if a real source for it appears.

Handle gracefully with a clear message, never a crash: POV demos, truncated/corrupt files,
CS:GO-era demos, and files that are not demos at all.

### 7.2 Memory model — the open question Phase 0 must answer

`demoparser2` is **query-based, not event-stream-based**: you ask it for fields and events rather
than hooking callbacks. This is a different shape from `demoinfocs` and has two consequences:

1. **It likely wants the whole decompressed file in WASM linear memory** (~300–400 MB), rather than
   consuming an incremental reader. That is acceptable *if* peak memory stays inside budget — one
   copy in linear memory is very different from one copy in the JS heap plus another in WASM. It
   also removes the entire `io.Reader` bridging problem that the Go route required, which was the
   single most fragile piece of the old plan.
2. **Queries must be batched.** Multiple passes over the demo for different field sets is the
   obvious way to write it and the wrong one. Extract everything the schema (§10) needs in as few
   passes as possible, and record the actual number in `docs/PARSER.md`.

**Phase 0 measures peak memory with a 400 MB demo before any of this is treated as settled.**
If peak memory fails the budget, the fallback is incremental feeding on the Rust side — cheaper to
build in Rust than the Go equivalent, but still real work.

### 7.3 Worker protocol

The worker sends only lightweight messages. It never posts large JSON. Both sides of it live in
`packages/demo-parser/src/protocol.ts` since #50, and that file is the copy that binds.

```ts
type WorkerOut =
  | { type: 'progress'; phase: 'decompress' | 'parse'; percent: number }
  | { type: 'header'; header: MatchHeader }
  | { type: 'done'; track: TickTrack; events: MatchEvents }   // ArrayBuffers TRANSFERRED
  | { type: 'error'; code: ErrorCode };                       // code, not prose — see §11

type WorkerIn = { type: 'parse'; source: File | FileSystemFileHandle };
```

Typed-array buffers move via the `transfer` list, never structured-cloned. **Cancellation is
`terminate()`, which is why `WorkerIn` carries no `cancel`:** a message could only ask the parse to
stop between passes, and neither the demo in linear memory nor a trapped instance survives being
asked politely (`docs/PARSER.md` §8). A worker never outlives one parse.

`source` accepts a `FileSystemFileHandle` so PWA file-handler launches (§12) avoid an extra copy.
The file is streamed into WASM a chunk at a time rather than read whole first, so the demo is never
held in the JavaScript heap and in linear memory at once — that duplication is what the §16 peak
budget is spent on.

`percent` counts finished passes, because upstream offers no hook inside one. `header` gets its own
message rather than riding on `done` for the same reason it is worth having: it is complete after
the second pass, while the third is still running.

`ErrorCode` is a machine-readable enum. The worker never produces user-facing prose — the UI maps
codes to translated copy. Failures that are the *worker's* rather than the demo's — a binary that
will not load, an allocation that will not fit — have no code of their own yet and collapse onto
`MALFORMED_DEMO`. That is #56's to fix, and it is a lie in the meantime.

---

## 8. Playback Engine

```ts
// packages/demo-core — plain mutable object, no reactivity
export const clock = { frame: 0, playing: false, speed: 1 };
```

- A single `requestAnimationFrame` loop advances `clock.frame` and drives the renderer directly,
  reading interpolated values from the typed arrays.
- The React tree is **not** re-rendered per frame.
- Text readouts update at most **10 Hz** via a throttled subscription.
- The scrubber writes `clock.frame` directly on pointer move — no round-trip through React state.

Zustand holds only **discrete** state: active filters, selected player, play/pause, playback speed,
visible radar layer, panel state.

---

## 9. Radar Rendering

**Canvas 2D by default.** The scene is ten dots, grenade markers, translucent circles and text.
`react-three-fiber` brings ~600 KB of three.js plus orthographic-camera, layer-ordering and
text-rendering friction for no visual gain. Adopt it **only** if a genuine 3D requirement is
confirmed with the human.

### Coordinate transform — use Valve's own data

Each map ships an overview definition (`resource/overviews/<map>.txt`) with `pos_x`, `pos_y`,
`scale`. Radar images are 1024×1024:

```
radarX = (worldX - pos_x) / scale
radarY = (pos_y - worldY) / scale        // note the inverted Y
```

Multi-level maps (Nuke, Vertigo) also provide `AltitudeMax` / `AltitudeMin` for the lower level.

`bun run mapdata:generate` turns these into typed constants in `packages/map-data`. The debug
overlay with X/Y/scale sliders exists to **verify** a map entry, not to calibrate by hand.

### Where the assets come from, and what a theme is

The overview files and the vanilla radar images are committed under `packages/map-data/assets/`,
taken from [`MurkyYT/cs2-map-icons`](https://github.com/MurkyYT/cs2-map-icons), which extracts them
from the game depot — no CS2 install is needed to regenerate. They are Valve's assets; the README's
Credits section says so, and the generator never reaches the network.

Radar images ship **per theme**, keyed in the data rather than branched on in the renderer:

- `vanilla` — the image exactly as Valve draws it.
- `blue` — the same image flattened onto the blue-shifted graphite ramp in `docs/DESIGN.md`,
  produced by `tools/scripts/mapdata/recolor.ts`. It is **ours**, generated from Valve's art, not
  anyone else's radar pack. It stays desaturated deliberately: CT is `#4A90D9`, and a saturated
  blue map would compete with the one colour that has to read as a side. Pixels above 0.75
  saturation — Valve's orange and green bombsite outlines — survive the flattening, and partially
  transparent pixels take a lighter ramp so Nuke's upper-floor ghost stays visible on a dark
  background.

Adding a third theme is a data change plus a ramp, never a change in the renderer. Because the
generator is deterministic, running it twice must leave the tree untouched — that is what makes the
committed images reviewable.

Radar images are **static assets**, fetched on demand and never imported into the JS graph; §16's
bundle budget counts JavaScript, and 8 radars at ~100 kB each would swamp it.

`apps/web` gets them from a Vite plugin (`apps/web/plugins/radar-assets.ts`, #76), which mounts
`packages/map-data/assets/radar/` at `/radar/` in dev and copies it into `dist/` on build — under
the name `radarAssetPath()` returns, unhashed, because that name is computed from the map data at
runtime and cannot carry a content hash. The plugin lists the directory rather than reading
`MAP_OVERVIEWS`: Vite externalises workspace packages while loading the config, so importing
`@disa/map-data` there leaves Node to resolve the package's own extensionless imports, and it
cannot. `apps/web/plugins/__tests__/radar-assets.test.ts` is what holds the directory and the map
data to each other — a level with no image, or an image no level names, fails it.

`/radar/*` keeps the Workers default `max-age=0, must-revalidate`; the `_headers` rule in §13
covers hashed names only, and unhashed plus `immutable` would pin a stale radar after a
`mapdata:generate`.

### What draws them — #79

The split is `CODE_REQUIREMENTS.md` §1's: `apps/web/src/core/renderer` is canvas plumbing —
device-pixel sizing, a `ResizeObserver` repaint, layers composited bottom-first — and knows nothing
about CS2. `apps/web/src/features/radar` is what knows about maps, sides and players: it resolves
the image through `radarAssetPath()`, reads positions out of `TickTrack` columnar, and places them
with `worldToRadar()`.

Drawing is demand-driven — data, level or size changed — never a loop. The entry point takes the
frame as an argument and no frame is held in React state, which is what lets Phase 4's clock drive
the same code unchanged.

Until that clock exists the radar draws **one** frame: `openingFrame()` in `packages/demo-core`, the
end of round 1's freeze time, which is the first moment the ten players stand where they chose to.

Which level is drawn is discrete state, defaulting to the level holding most of the living players;
a player on another level is drawn at low opacity rather than silently placed on this one. The
debug overlay of §9 above **verifies** an entry — map, frame, altitude band, and the world and radar
coordinates under the pointer, with a manual level override — and deliberately cannot edit `posX`,
`posY` or `scale`.

Side identity never rests on hue alone (`docs/DESIGN.md` §2): CT is a circle, T is a diamond, and
the two colours are read out of the `--color-ct` / `--color-t` tokens at draw time rather than
written into the renderer. A colour-blind *variant* of those tokens is still unbuilt — it is a
settings concern, and no settings slice exists yet.

---

## 10. Event Schema

Lives in `packages/demo-core/src/schema.ts` — single source of truth. Changes require a
`SCHEMA_VERSION` bump. The Rust side must produce exactly this shape.

- **Kills:** attacker, victim, assister, weapon, headshot, wallbang, through smoke, no-scope,
  attacker blind, victim blind, distance, tick
- **Damage:** attacker, victim, weapon, HP/armour damage, hitgroup, tick
- **Grenades:** thrower, type, throw tick, detonation tick, sampled trajectory, detonation position;
  for molotov/smoke also expiry/extinguish tick
- **Blinds:** per affected player, duration, teammate flag
- **Objectives:** plant, defuse start/complete/abort, site
- **Rounds:** start/end tick, winner, win reason, freeze-time end
- **Economy:** per-round equipment value, buy type, money

**Phase 0 must confirm every one of these is extractable from `demoparser2`.** Grenade
trajectories and per-player blind durations are the likeliest gaps in a query-based model — check
them first, not last.

### Sound visualisation — be honest about what it is

"Sound spheres" are a **free-field approximation**. Source 2 audibility depends on attenuation *and*
geometric occlusion; 800 units through a Mirage wall and 800 units down an open corridor are not
comparable.

- The UI must label this explicitly ("audible radius, ignoring walls").
- Radius derives from player state via constants in `packages/map-data`.
- Real occlusion is a **stretch goal**, plausibly approximated with the public `.nav` mesh.
  Do not claim occlusion support until it exists.

---

## 11. Internationalisation

Two locales: **English (`en`, source) and Russian (`ru`)**. Patterns and examples live in
`CODE_REQUIREMENTS.md` §8; the architectural rules are here.

### Structure

`packages/i18n` owns resources, the typed key union, and the `<Text>` / `useT` API. Namespaces:
`common`, `library`, `timeline`, `filters`, `radar`, `settings`, `errors`. Only the active locale is
loaded —
locales are dynamic imports, never bundled together.

### Keys are typed

The key union is generated from the `en` resources by `bun run i18n:check` and consumed via
module augmentation of the `FormatjsIntl.Message` interface. **A typo in a key is a compile error,
not a runtime fallback.** An untyped key path is the difference between real i18n and stringly-typed
guessing. The same augmentation makes the message record react-intl is given a
`Record<TranslationKey, string>`, so an incomplete locale is a type error as well as a test failure.

### Game vocabulary is not translated

This is the rule most likely to be got wrong. Russian-speaking CS players use the English terms.
Translating them makes the tool read as though it were written by someone who does not play.

| Not translated | Translated |
|---|---|
| Weapon names (AK-47, Deagle, AWP) | UI chrome, labels, buttons, settings |
| Map names (Mirage, Nuke, Ancient) | Explanatory and help text |
| Callouts and sites (A, B, Mid, Palace) | Error messages |
| Domain shorthand (eco, force, clutch, ace, wallbang, entry) | Onboarding and empty states |

Game vocabulary lives in `packages/demo-core` as canonical constants, not in locale files. If a
term genuinely needs localising later, it moves — but the default is: leave it.

### Formatting

- Numbers, percentages, dates: `Intl.NumberFormat` / `Intl.DateTimeFormat` with the active locale.
  Never hand-format, never translate a formatted string. RU uses a comma decimal separator —
  `2.4s` vs `2,4 с` is not a translation, it is formatting.
- Plurals use ICU. **Russian needs four forms** (`one` / `few` / `many` / `other`): 1 убийство,
  2 убийства, 5 убийств. A translation file with only singular and plural is broken for `ru`.
- Never build a sentence by concatenating translated fragments. One key, one complete sentence,
  with interpolation.

### Runtime

- Initial locale: persisted preference → `navigator.language` → `en`.
- `<html lang>` updates when the locale changes.
- Missing key: throws in development, falls back to `en` in production.
- `bun run i18n:check` runs in CI and fails on missing or orphaned keys.

---

## 12. PWA

The app is installable and offline-capable. This produces the best interaction in the product:
**double-click a `.dem` file in the OS and it opens in the analyzer.**

```jsonc
{
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "launch_handler": { "client_mode": "focus-existing" },
  "file_handlers": [
    { "action": "/open", "accept": { "application/octet-stream": [".dem", ".dem.zst", ".dem.bz2"] } }
  ]
}
```

`launchQueue.setConsumer` yields `FileSystemFileHandle`s — pass the handle straight to the worker
(§7.3). File Handling is Chromium-desktop-only: feature-detect (`'launchQueue' in window`) and keep
the file picker and drag-and-drop paths working everywhere.

### Service worker

Use `vite-plugin-pwa` in **`injectManifest` mode**, not `generateSW`. Our requirements are specific
enough that a hand-written service worker is simpler than configuring generated one, and it removes
a layer of build-time magic:

- **Do not precache the WASM binary.** Runtime `CacheFirst` with a visible download indicator on
  first parse. (At ~800 KB this is far less pressing than it would have been with Go, but the rule
  stands: the shell should install instantly.)
- Precache only the app shell — HTML/JS/CSS/icons/radar images/active locale.
- Ship an explicit update prompt. A stale service worker plus a new `SCHEMA_VERSION` produces
  confusing cache bugs.
- The app must be genuinely usable offline, and say so rather than failing.

It works under Bun — verified in #22, no Node fallback needed (§20). What is wired today:
`vite-plugin-pwa` in `injectManifest` mode, `apps/web/src/sw.ts` calling `precacheAndRoute` over a
nine-entry shell, and the manifest above emitted from `apps/web/vite.config.ts`.

Two deliberate gaps, both Phase 6:

- **The worker is built but never registered** (`injectRegister: false`). Registering it before the
  update prompt exists makes the shell cache-sticky with no way to ask for the reload — the exact
  bug the bullet above warns about. Phase 6 turns the option on and adds the prompt together.
- **Fonts are outside the precache.** 240 kB of woff2 that the shell renders without, so they stay a
  runtime concern alongside the WASM binary.

The precache glob is `**/*.{html,css,js}` and stops there on purpose. The manifest and its icons are
added by the plugin itself; globbing them as well puts every one of them in the list twice.

---

## 13. Hosting — Cloudflare Workers (static assets)

Cloudflare recommends Workers with static assets over Pages for new projects; static and dynamic
live in one deployment, so adding `apps/api` later needs no migration.

Production is **https://disalytics.disa-67b.workers.dev**. `disalytics.gg` is the eventual home
(`CONTRIBUTING.md` §5) but pointing it here is an account-level step that has not been taken.

`wrangler.jsonc` sits at the repository root and declares no `main`: this is an assets-only Worker,
and hard rule 1 is the reason it is going to stay that way.

```jsonc
// wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "disalytics",
  "compatibility_date": "2026-07-01",
  "workers_dev": true,
  "preview_urls": false,
  "assets": {
    "directory": "./apps/web/dist",
    "not_found_handling": "single-page-application"
  }
}
```

`workers_dev` publishes production on `workers.dev`.

`preview_urls` is what makes `wrangler versions upload` return a per-version URL. **It is off
since #33, and pull requests get no preview deployment** — see §15 for how to turn it back on. It is
written out rather than omitted because left unset it defaults to whatever `workers_dev` is, which
would silently turn previews back on.

Turning it off is also the only way to retire a preview URL that has already been published.
A versioned preview URL has no documented expiry — Cloudflare states a retention limit only for
*aliased* preview URLs, at the 1000 most recent — and `wrangler versions` offers `view`, `list`,
`upload` and `deploy` but no `delete`. Disabling the setting disables routing to both versioned and
aliased preview URLs, retroactively, on the next `wrangler deploy`. That is wholesale or nothing;
there is no per-version revocation.

### Caching

Workers serves static assets as `Cache-Control: public, max-age=0, must-revalidate` by default.
Immutable caching is **not** automatic and has to be asked for, in `apps/web/public/_headers`:

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Vite content-hashes everything it writes into `assets/` — JS, CSS, fonts, and the WASM binary when
it arrives — so the one rule covers all of it. `index.html` keeps the revalidating default on
purpose: it is the one file whose name never changes.

`_headers` and `.assetsignore` live in `apps/web/public/`, not in the assets directory, because
`apps/web/dist` is generated. Vite copies `public/` verbatim, dotfiles included.

Constraints:

- **Individual static asset file size: 25 MiB**, all plans. With the Rust parser at ~800 KB this
  stops being a live risk, but the CI gate stays as a regression guard.
- 20,000 static asset files per version on the free plan.
- Static asset requests are not billed as Worker requests — a static SPA is effectively free.
- Content-hashed WASM filename + `Cache-Control: public, max-age=31536000, immutable`.
- `.wasm` must be served as `application/wasm` for `instantiateStreaming`. Assert in the deploy
  smoke test.
- **Do not set COOP/COEP headers.**
- Unlike Pages, Workers does not auto-exclude `node_modules`/`.git` — add `.assetsignore`.

### The smoke test

`bun run smoke <url>` (`tools/scripts/smoke.ts`) asserts the list above against a running
deployment: the shell loads, an unknown path still returns the shell, hashed assets come back
`immutable`, neither COOP nor COEP is set, `.wasm` is `application/wasm`, and a radar image is
`image/png`. It reads `apps/web/dist` to decide what to request, so it always tests the build that
was shipped rather than a hardcoded path list.

The radar assertion is about the content type and not the status, because `not_found_handling`
answers a path the build never wrote with the SPA shell: a missing `/radar/blue/de_vertigo.png`
comes back **200 `text/html`**, measured on production. Only the content type separates a radar
that shipped from one that did not.

`deploy.yml` runs it after every production deploy. Locally, `bun run preview` then
`bun run smoke http://127.0.0.1:8787` runs the same assertions against workerd, which is the same
asset server production uses. `bun run preview` is `wrangler dev` on `:8787` and is unrelated to
Cloudflare preview URLs despite the shared word — it is local, and #33 did not touch it.

It waits for the URL to route before asserting anything. A newly created `workers.dev` route 404s
at the edge for up to a minute after `wrangler deploy` has already printed it — the first
production run of `deploy.yml` failed exactly this way, on a deployment that was in fact correct.
A 404 that means "not routed yet" and a 404 that means "broken" are indistinguishable from a single
request, so the wait is what makes the difference legible.

The `.wasm` assertion reported `skip` with its reason from #23 until #52, first because no binary
existed and then because nothing in `apps/web` imported the worker — Vite emits the binary only when
the application's own graph reaches it. Wiring the consumer turned it green without the assertion
changing: **12 passed, 0 failed, 0 skipped**.

---

## 14. Contribution Flow

Full commands, labels and templates in **`CONTRIBUTING.md`**. The short version, which agents must
follow:

1. Work starts from an issue. No issue, no branch.
2. Branch is created from the issue with `gh issue develop`, so the link is recorded by GitHub.
3. One PR per issue, closing it with `Closes #N`.
4. Merged with **squash only**. The squash title is the conventional-commit subject.

Never push to the default branch. Never open a PR that closes more than one issue.

---

## 15. CI/CD — GitHub Actions

The repository is **public**: standard-runner minutes are free, as is CodeQL.

**`wasm.yml`** — **exists since #44.** `bun run errors:check` → `cargo fmt --check` →
`clippy -D warnings` → `cargo test` → `bun run wasm:build` (which is `wasm-pack build --target web`,
release by default, `wasm-opt` inside) → `bun run wasm:smoke` → `bun run size --wasm`. Caches the
cargo registry, `target/` and the compiled `wasm-pack`.

*Never rebuild the parser on a frontend-only commit.* Since #52 that promise is kept by a cache
rather than by a path filter, because the SPA now imports the worker and `vite build` cannot emit
the binary without `crates/demo-parser-wasm/pkg`. This workflow **writes** that directory to a cache
keyed on the parser's own inputs — `crates/*/src/**`, `crates/*/Cargo.toml`, `vendor/**`,
`Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, and the pinned `wasm-pack` version. `ci.yml` and
`deploy.yml` restore it, and install a Rust toolchain only when the key misses.

The key is written out in three files and they have to agree exactly. Two ways they stop agreeing:
a `WASM_PACK_VERSION` that drifts, and — the one that already happened once — hashing `crates/**`.
`pkg/` lives under `crates/` and *is* what is being cached, so this workflow would hash it after
building it while the other two hash before, and no restore would ever hit. Name sources, never the
directory that contains the output.

The smoke step runs **before** the size gate and is not optional: `docs/PARSER.md` §8 records an
artifact that measured 293 KB because its entry point trapped and the optimiser deleted the parser
behind it. Only a call into the binary tells that apart from a real build.

Since #50 it is also the only check on `packages/demo-parser/src/wasm-glue.d.ts`. That declaration
is written by hand — `pkg/` is gitignored, so a fresh clone has to typecheck before any binary
exists — and the smoke test calls every export it claims. A rename on the Rust side fails there
rather than in a browser.

`fmt` names its packages rather than using `--all`, because cargo-fmt's `--all` reaches into local
path dependencies and `vendor/` is upstream code (`vendor/README.md`). A new crate under `crates/`
has to be added to that command by hand.

It triggers on `crates/**` **and** on `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` and the
workflow file. A lockfile bump or a toolchain change alters the binary without touching a crate, so
`crates/**` alone would let exactly the riskiest changes through ungated.

It asserts the §16 binary budget itself rather than leaving it to `ci.yml`. `ci.yml` carries the
mirrored `paths-ignore: crates/**`, so on a parser-only pull request it does not run at all — the
`--wasm` flag exists so the budget can be checked without building the SPA to reach it. The same
mirror is why `errors:check` runs in both workflows: the two halves of the `ErrorCode` vocabulary
live on opposite sides of that `paths-ignore`, so neither workflow alone sees every change to it.

No artifact is uploaded anywhere: nothing consumes `pkg/` yet.

**`ci.yml`** — **exists since #20.** Every PR and every push to `main`: `setup-bun` (pinned to
`devEngines`) → `bun install --frozen-lockfile` → `typecheck` → `check` (Biome) → `i18n:check` →
`errors:check` → `test` → restore-or-build the parser → `build` → `size` gate, in one job, in that
order. Bun's install cache is keyed on `bun.lock`. `paths-ignore: crates/**`, so a parser-only
commit does not run the frontend pipeline — the mirror of the rule above. Required status checks on
the default branch: see `CONTRIBUTING.md` §5, including what `paths-ignore` costs a parser-only pull
request.

**`deploy.yml`** — **exists since #23.** Triggered by `workflow_run` on `ci` **and on `wasm`**, so
it is strictly downstream of a green pipeline instead of racing one. It holds **one job**: a
successful `push` run on `main` rebuilds from the run's `head_sha` — parser included, from the same
cache `ci.yml` reads — deploys production, and runs the §13 smoke test against the URL it just
produced. `cloudflare/wrangler-action` uses the `wrangler` already in the lockfile, so the version
is pinned in exactly one place. Pull requests get no deployment of any kind — see *Previews are off*
below.

`wasm` is one of its triggers because of the `paths-ignore` mirror: a parser-only commit greens
`wasm`, never runs `ci`, and would otherwise reach production only on the next unrelated frontend
commit. A commit touching both halves runs both workflows and deploys the same SHA twice; the
`deploy-production` concurrency group serialises that instead of racing it.

Three things about `workflow_run` that are easy to get wrong. It hands repository secrets to the
triggering run's code, so any job added here must refuse forks by checking `head_repository` — a
fork's pull request has been linted, not vetted, and `CLOUDFLARE_API_TOKEN` is not something to
hand it. It is only ever read from the default branch, which means a change to `deploy.yml` cannot
be exercised on the branch that makes it; the first real run is always the one after the merge. And
**the job does not run at the commit that triggered it** — it runs at the default branch's head.
That is why the job checks out `github.event.workflow_run.head_sha` explicitly, and it is load
bearing for everything below.

### Deployment records

**Exists since #30.** Every production deploy is recorded under the repository's Deployments, so
what is live, from which commit, and whether it passed §13 is answerable from GitHub rather than
from a workflow log. `cloudflare/wrangler-action` does not do this for Workers: it creates GitHub
deployments only on the Pages code path, so it is asked for explicitly.

Production uses a **job-level `environment:`**. A `push` run on `main` is the one case where the
job's own commit *is* the deployed commit, so GitHub attaching the deployment to the running SHA is
correct. It opens the deployment when the job starts and closes it with the job's conclusion, which
is what makes a failed smoke test land as a failed deployment instead of a healthy one — no extra
step reports it. `url:` reads `steps.deploy.outputs.deployment-url`; GitHub's allowed-contexts list
for `environment.url` omits `steps`, but the example on the same page uses it and it does work,
verified on the first run. The side benefit is that `production` is a real GitHub environment, which
protection rules can later be attached to.

### Previews are off

**Since #33.** `preview_urls` is `false` (§13) and `deploy.yml` has no preview job. The reason is
retention, not cost: static asset requests are free and unlimited, but a versioned preview URL has
no expiry and `wrangler versions` has no `delete`, so every pull request used to leave a public URL
that could not be retired individually.

**To turn previews back on, revert the single squash commit that closed #33** — it carries the
`wrangler.jsonc` flag and the whole preview job together. Do not hand-rebuild it, and pick up #34 in
the same breath: the revert restores previews *without* the inactive-on-close cleanup, which is the
gap that made them worth turning off.

Two things that revert brings back and that must not be "simplified" afterwards:

- The preview job records its deployment through the **Deployments API against
  `github.event.workflow_run.head_sha`**, not through a job-level `environment:`. Given the SHA
  behaviour above, an `environment:` block would attach the deployment to `main` — invisible on the
  pull request, and a false claim about what `main` is running. It looks like pointless duplication
  of the production job. It is not.
- Creating that deployment needs `auto_merge: false` and `required_contexts: []`, or the API answers
  202/409 and creates nothing.

Also in use: **Renovate** (handles monorepos better than Dependabot), **GitHub Releases** for test
fixture demos. Never Git LFS — 1 GB free quota, easy to exhaust, painful to undo. Never commit
`.dem` files.

---

## 16. Performance Budgets

CI assertions where possible. A regression here is a blocker.

| Metric | Budget | Note |
|---|---|---|
| Parse a 300 MB demo | < 15 s | Set from Phase 0 and **measured properly by #59**: in a foreground Chrome tab, off disk, drop to summary, three runs per input on an idle machine. The shipped `-Oz` binary takes **15.29 s** on the 353 MB raw fixture and **18.85 s** on the 264 MB `.dem.zst` — over budget on both, and the container is what most people have. `-O3` takes **11.11 s** and **14.19 s** for 0.40 MB more binary, which is the only configuration measured where this budget and the WASM one hold at once; **#66 makes that the shipped profile** and the 15 s stands as written. Measure from the drop: worker spawn plus `init()` is 0.08 s cold. Two things this number does *not* cover — a tab the user switches away from, which is 5× slower because Chrome backgrounds the renderer, and genuinely slow hardware, which `docs/PARSER.md` §11 keeps open. Full method and breakdown in `docs/PARSER.md` §16; the earlier native, Bun and blob-fed figures are §9, §14 and §15. |
| Peak tab memory during parse | < 1.5 GB | 663 MB of WASM linear memory measured, ~1.0 GB estimated whole-tab. True tab memory cannot be measured without cross-origin isolation, which §13 forbids. A container adds a second copy while it is expanded — 264 MB compressed beside 353 MB expanded, **617 MB**, under what the parse itself reaches. It stays a transient because the compressed file is freed before the passes rather than after them (`docs/PARSER.md` §15). |
| Timeline scrubbing | 60 fps sustained | |
| Cached-demo load (second visit) | < 3 s to interactive | **0.02 s, measured by #51** — the 264 MB `.dem.zst` fixture, foreground headed Chrome 151 over CDP, timed from the file landing on the input to the summary screen, three runs. The cache entry is **11.04 MB**, a 24× reduction on the container. With OPFS deleted before any application script runs, the IndexedDB fallback answers in **0.03 s** off the same key. The cold visit that fills the cache costs **18.60 s** (OPFS) and **18.48 s** (IndexedDB) against the 18.85 s #59 measured for the same input without a cache, so **storing a demo costs nothing measurable on top of parsing it**. `navigator.storage.persist()` returned `false` on this profile, which is the ordinary Chrome answer (§6.4). Storing runs **after** the demo is interactive and takes **0.39 s** for 11.04 MB, persistence request included — so a reader who leaves the moment the summary appears loses the entry and pays the parse again. That is the cost of not blocking the screen on a write, and it is the right way round. |
| JS bundle, excl. WASM | < 500 kB gzip | single locale only. **101.22 kB, 20.2% of budget** since #51 — the 3.56 kB is `@disa/demo-store`, which adds no runtime dependency: the container codec, the fingerprint and the two tiers are all platform APIs. 97.66 kB since #52 — 81.20 kB at the end of #22 plus the library screens. Of the 16.46 kB it added, 10 or so are `tailwind-merge` (105 kB raw), which arrives with the first `cn()` on screen and not again; the parse worker's own chunk, glue included, is 2.60 kB. Asserted by `bun run size`, which counts every non-locale chunk plus the heaviest locale chunk, gzip level 6, decimal kB — the unit Vite's build report uses. |
| WASM binary | < 4 MB (CI fails above 24 MB) | tight gate as regression guard. Asserted by `wasm.yml` since #44. **2.22 MB, 55.5% of budget** — rising to 2.62 MB, 65.6%, when #66 switches the profile to `-O3`, which is what buys the parse-time budget above with the real parser inside, measured after `bun run wasm:smoke` called into the binary — a size taken from an artifact that has never run is worthless (`docs/PARSER.md` §8). 2.00 MB before #50; the 0.13 MB is the `js-sys` marshalling that hands the parsed demo over as JavaScript objects. 2.13 MB before #48; the 0.09 MB is the two container decoders (`docs/PARSER.md` §15). Phase 0 measured 2.18 MB at `-O`; that difference is this repository's `-Oz` and `panic = "abort"`. |

---

## 17. Design

Full system in **`docs/DESIGN.md`**. Rules that constrain engineering:

1. **No animation on the main thread during playback.** `transform` and `opacity` only. Nothing
   that triggers layout. No animation library driving React state per frame.
2. Motion belongs to UI transitions, not the render loop.
3. **All numbers use tabular figures.** Non-negotiable.
4. **Colour carries meaning.** Team and event colours are semantic tokens with colour-blind-safe
   variants; interaction is expressed in luminance, not hue.
5. `prefers-reduced-motion` respected everywhere.
6. **Layouts must survive Russian text**, which runs 15–30% longer than English. No fixed-width
   labels, no truncation-by-default, no layout that only works in `en`.
7. Empty states, parse progress and error states are designed screens. They are what every user
   sees first.

---

## 18. Definition of Done

1. `bun run typecheck` passes
2. `bun run check` passes with no new suppressions
3. `bun run i18n:check` passes — no missing or orphaned keys in either locale
4. `bun run test` passes; new logic in `demo-core` has unit tests; `cargo test` passes for crates
5. No performance budget in §16 regressed
6. No new runtime dependency without approval
7. Behaviour changes reflected in this file or in `docs/`

**Testing note:** never commit a `.dem`, and do not publish one either — a GOTV recording carries
ten real players' names and SteamIDs, and the product's whole point is that demos stay with the
person who has them. The fixture is **developer-supplied**: `DISALYTICS_FIXTURE_DEMO` names a demo
on disk and the test reports itself skipped without it, which is what CI does.

What is committed is the **golden snapshot** of parsed output. Parser changes that alter it get
reviewed by hand, never auto-accepted. It is regenerated with `DISALYTICS_UPDATE_SNAPSHOT=1`.

The trade this makes: the snapshot pins one demo that only its owner can reproduce. It catches
drift, not correctness on demos nobody here has. Breadth is the unit tests' job, and §7.1's
"handle gracefully, never a crash" list is what covers the demos the fixture is not.

---

## 19. Roadmap

### Phase 0 — Parser validation — **complete, all criteria passed**

A pass/fail test of the Rust default, not an open exploration. Full findings in `docs/PARSER.md`;
the verdict is in its §10.

| Question | Pass condition | Result |
|---|---|---|
| Does it parse a 400 MB demo in-browser? | completes without crashing | pass — 337 MB, three passes |
| Peak tab memory? | < 1.5 GB | pass — 663 MB WASM, ~1.0 GB estimated |
| Parse time? | record the real number and set the §16 budget from it | pass — 10.4 s; §16 now reads < 15 s |
| Is the full §10 schema extractable? | grenade trajectories and per-player blind durations first | pass — both present |
| Shipped WASM size? | < 4 MB | pass — 2.18 MB |

Go was never built. Query batching (§7.2) is settled at three passes, which upstream imposes as a
floor. Four consequences carry into Phase 2 — a pinned and patched upstream, output that differs
between threading modes, silently dropped prop requests, and no cheap parse-time win — all detailed
in `docs/PARSER.md` §10.

### Phase 1 — Foundation
Bun + Turborepo + Biome + Vite, `apps/web` skeleton, `packages/i18n` with both locales wired from
day one, design tokens, three workflows, size gates, Cloudflare Workers deploy, labels and issue
templates. Includes the PWA-plugin-under-Bun verification task (§12).

### Phase 2 — Parsing pipeline
Rust core crate + wasm wrapper, decompression, worker protocol, columnar output, OPFS cache +
`storage.persist()`, progress and cancel UI.

### Phase 3 — Radar
`map-data` generation, Canvas 2D renderer, multi-level layers, debug overlay.

### Phase 4 — Playback
rAF clock, interpolation, timeline scrubber, speed control, tick stepping, event markers.

### Phase 5 — Analytics
Filter system, highlight extraction, sound-radius visualisation, grenade trajectories, round
summaries.

### Phase 6 — PWA polish
File handlers, install prompt, offline shell, demo library, update flow.

### Later
`apps/api` for accounts and shared review links; `apps/landing`; Tauri if the native parser path
proves worth it.

---

## 20. Decisions and Open Questions

### Decided

- Rust parser (`demoparser2`) as the default; Phase 0 confirms rather than explores
- Core parser crate free of `wasm-bindgen`, so a native Tauri build stays possible
- Decompression lives in the parser crate behind pure-Rust decoders, not on the JS side (§7.1)
- Bun as package manager; text lockfile committed
- Cloudflare Workers static assets, not Pages
- Canvas 2D, not react-three-fiber
- Zustand for discrete state; clock outside React; signals rejected for now
- react-intl with generated typed keys; game vocabulary stays in English. i18next was the original
  choice, but it cannot read the ICU message syntax `CODE_REQUIREMENTS.md` §10 is written in without
  `i18next-icu` + `intl-messageformat` on top — three packages to react-intl's one, for the same
  formatter underneath
- Public repository; issue-driven flow; squash-only merges
- **The release profile spends binary size on parse time.** `-Oz` misses the 15 s budget on both a
  raw demo and a `.dem.zst`; `-O3` meets it on both for 0.40 MB, inside a 4 MB cap that is only
  half used. Decided 7 August 2026 from #59's measurement, implemented by #66
- Positional sampling starts at **16 Hz**. If duel analysis proves it insufficient in Phase 5, add
  full-tick-rate *detail windows* (±3 s) around kills — ~90 KB per kill, ~7 MB per match — rather
  than raising the global rate
- Multi-demo comparison is out of scope for v1

### Open

- [x] Default branch name — `main`, in use since the repository was created.
- [x] Peak memory with the whole demo in WASM linear memory (§7.2) — 663 MB, `docs/PARSER.md` §9.
- [ ] A cheap way to read a demo header — `only_header` costs a full pass (`docs/PARSER.md` §8)
- [ ] **Is there a light theme?** `CODE_REQUIREMENTS.md` §1 promises a `core/theme/` light/dark
      provider and §6.4 stores `theme` in localStorage, but `docs/DESIGN.md` designs only the dark
      instrument palette and §1 argues for it at length. The app currently ships dark as its only
      theme. Either design a light palette or drop the provider from the docs.
- [x] Does Vite + `vite-plugin-pwa` build cleanly on the Bun runtime? — yes, #22. Plugin 1.3.0,
      `injectManifest`, Vite 8.2.0, Bun 1.3.13: manifest, `sw.js` and a nine-entry precache list all
      emitted correctly, and the Node fallback stayed unused. The plugin's own worker build prints
      `inlineDynamicImports option is deprecated` on Vite 8 — cosmetic, upstream, and the only
      friction found.
- [ ] `.nav` mesh occlusion for the audibility model — revisit after Phase 5
- [ ] Tauri: is native parsing worth the second shell? — revisit after Phase 6

---

## 21. When You Are Unsure

Ask rather than guess if a task would:

- add a runtime dependency or noticeably increase bundle size
- introduce async I/O into the scrub or render path
- change the event schema or `SCHEMA_VERSION`
- require server-side anything
- exceed a performance budget in §16
- add react-three-fiber, or move `clock.frame` into a reactive store
- animate anything during playback
- add `wasm-bindgen` to `crates/demo-parser`
- hardcode a user-facing string, or translate game vocabulary

These are the decisions this document exists to protect.
