# PARSER.md

What upstream `demoparser` can and cannot produce, the traps in driving it, and what the crate does
about them. Every claim was measured against a real demo. Section numbers are stable — code cites
them. Full measurements and method live in the PR named in each heading.

**Fixture** unless stated: FACEIT GOTV `de_dust2`, 353 MB decompressed (264 MB `.dem.zst`), 30 rounds,
10 players. A second demo, the IEM Atlanta 2026 inferno map (398 MB), is cited as "inferno".

---

## 1. Verdict

The `AGENTS.md` §10 schema is fully extractable from upstream, including grenade trajectories and
per-player blind durations. Rust was confirmed in Phase 0; Go was never built.

## 2. What was tested

Upstream `github.com/LaihoE/demoparser`, crate `parser` (not on crates.io), vendored at a pinned
revision in `vendor/` — `vendor/README.md` lists every patch. `demoparser2` is the name of the Python
and JS bindings, not of the Rust crate. Probes live in `tools/probes/`.

## 3. Query batching

Upstream `second_pass/collect_data.rs::collect_entities` has two early returns:

- events + player props share a pass **only when a wanted prop needs velocity**
  (`event_with_velocity`). `TICK_PROPS` asks for `velocity`, so events ride with the tick columns.
- `parse_projectiles` replaces player-prop collection and writes into the same table under the same
  ids, so trajectories need a pass of their own.

The parse is therefore **two passes** (Phase 0 read it as three; corrected in §25).

## 4. Schema coverage

| Group | Source |
|---|---|
| Kills | `player_death` — `attacker_*`, `user_*`, `assister_*`, `weapon`, `headshot`, `penetrated`, `thrusmoke`, `noscope`, `attackerblind`, `distance` |
| Damage | `player_hurt` |
| Shots | `fire_bullets` (§18, §22) |
| Grenades | projectile pass (trajectory), `*_detonate` events, expiry from §19 |
| Blinds | `player_blind.blind_duration` per affected player |
| Objectives | `bomb_planted`/`bomb_defused` (`site` = entity id), `bomb_begindefuse`, `bomb_exploded` |
| Rounds | `round_start`, `round_end`, `round_freeze_end`, `round_officially_ended`, `m_iRoundTime` |
| Economy | `m_iAccount`, `m_iEquipmentValue`, `m_iCashSpentThisRound`, read at freeze end |

Victim-blind-at-death is derived, not a field. `bomb_abortdefuse` and `bomb_abortplant` have never
occurred in a demo here.

## 5. Defects and traps

- **`*_grenade_type` on events is filled with the tick** (28,306 of 28,306). Never read it.
- **`parse_grenades: true` destroys trajectories** — it adds inventory entities with all-`None`
  coordinates. Always `parse_grenades: false`.
- **Lowercase `attacker_x/y/z` are always null**; read the uppercase `attacker_X/Y/Z`.
- **Friendly prop names are not resolved by the core crate** — `health` silently produces no column.
  Use real paths (`CCSPlayerPawn.m_iHealth`) and **assert every requested prop produced a column**.
- **Some props silently force single-threaded parsing** (`NON_MULTITHREADABLE_PROPS`), which makes
  native benchmarks misleading unless the prop set is fixed.
- **Upstream's build scripts reach the network** — deleted in `vendor/`; the protobuf code is committed
  upstream (§12).

## 6. Consequences for `crates/demo-parser`

Vendor by revision · no network in the build · real prop paths, verified · ignore `*_grenade_type` ·
`parse_grenades: false` · `ParsingMode::ForceSingleThreaded` everywhere, so native tests and the
browser see the same output.

## 7. Determinism

Multi-threaded and single-threaded modes differ: only the multi-threaded path deduplicates
`player_first_connect` (10 vs 67 events). Pinning single-threaded mode makes native and WASM output
identical. Connect events are not in the schema, so nothing needs deduplicating (§13). The prop set is
part of the schema contract.

## 8. The browser build

- **`std::time::Instant::now()` traps on `wasm32-unknown-unknown`.** Two unconditional calls in
  upstream's profiling code are patched to be lazy. `rayon`, `memmap2` and `libc` compile fine.
- **A binary that traps early gets its parser optimised away** — a 293 KB "success" that parsed
  nothing. Only measure size after `wasm:smoke` has called into the binary.
- **An aborted instance is poisoned**: every later call traps. Recovery is terminating the worker.
- **`only_header: true` does not short-circuit** — it costs a full pass.
- Two `getrandom` majors each need their browser feature, plus `RUSTFLAGS=--cfg getrandom_backend="wasm_js"`.
- Native single-threaded and browser output match exactly.
- **Measure on an idle machine.** An early 44 s figure was taken during a `cargo` build and "confirmed"
  by a second run under the same load; the real figure was 10.4 s.

## 9. Parse cost

Losing threads costs ~3.4× and WASM itself ~1.6× against native multi-threaded. Neither is
recoverable (no COOP/COEP), so parse time only improves by **doing less work** — fewer passes, fewer
props. WASM linear memory never shrinks, so it can be read after a parse under Bun. True tab memory
cannot be measured without cross-origin isolation.

## 10. Phase 0 verdict

All five criteria passed: parses a large demo in-browser, peak memory under 1.5 GB, parse time set the
15 s budget, full schema extractable, WASM under 4 MB. Current figures are in `AGENTS.md` §16.

## 11. Still open

A cheap header read · `bomb_abortdefuse`/`bomb_abortplant` on a real demo · parse time on genuinely
slow hardware (CDP CPU throttling does not reach a worker; efficiency cores are a 5× lower bound) ·
bombsite names, which need map polygons (#58) · shotgun shot counts (#230).

## 12. Found while adopting it (#46)

- **A file shorter than 16 bytes panics upstream** before its own length check. With `panic = "abort"`
  that kills the worker, so the crate guards the length itself.
- **No demo is committed.** Crate tests use synthetic bytes (wrong magic, Source 1 magic, short file,
  magic over noise) that run the real parser and assert the `ErrorCode`.
- **Upstream commits its generated protobuf code**, so deleting the build scripts was the whole fix.

## 13. Found while extracting the schema (#49)

- **`DemoOutput.projectiles` is always empty** — trajectories live in the shared table under
  `GRENADE_X/Y/Z`, `ENTITY_ID_ID` etc.
- **Projectile entity indices are recycled.** A flight is keyed by index and start tick, split on a
  sample gap over 8 ticks. 519 flights match `weapon_fire` counts per type exactly.
- **Molotov and incendiary share `CMolotovProjectile`**; the type comes from the thrower's latest
  `weapon_fire`. Fires are a separate `inferno_*` entity, joined by thrower and time.
- **`player_death.distance` is metres** (×39.37008 for units).
- **The bombsite has no name** — `site` is a trigger entity id; `m_iBombSite` reads 0.
- **The demo reports no tick rate** — `sv_tickrate` is not broadcast. The rate is the constant 64,
  confirmed by `mp_freezetime = 20` against a 1,280-tick buy phase (§21). The demo *does* carry other
  convars (§21).
- **Warmup `round_end`s are dropped**: rounds are assembled after `begin_new_match`. Overtime halves
  swap sides too.
- **The release profile dominates parse cost**: the columnar write is ~0.2 s; `-Oz` cost 1.8× natively.

Running the fixture test:

```sh
DISALYTICS_FIXTURE_DEMO=/path/to/demo.dem cargo test -p demo-parser --test fixture
DISALYTICS_UPDATE_SNAPSHOT=1 …   # rewrites tests/snapshots/parsed-demo.json — review the diff by hand
```

The snapshot comparison skips when the demo's header is not the snapshot's own; the self-consistency
assertions still run on any demo.

## 14. The WASM boundary (#50)

- **Not JSON.** `TickTrack` as JSON is tens of MB of text parsed into the wrong type; `js-sys` builds
  objects and typed arrays directly and adds no crate.
- **Every buffer is JavaScript-owned**, copied out of linear memory — a view cannot be transferred and
  dangles after `terminate()`. `wasm:smoke` asserts `buffer.byteLength === byteLength`.
- **The demo goes in chunk by chunk** into `DemoBuffer`, reserved up front, so ~350 MB is never held
  twice; the buffer is dropped before output is allocated.
- **Progress is a byte position inside a pass** (#354): a hook in `vendor/` exposes the second-pass
  frame loop's offset. `Progress` emits each whole percentage once, every pass an equal share, 100 only
  when the last pass completes; a container reports compressed bytes consumed. Arithmetic is `u64`.
- **The header is posted before `done`**, as soon as the first pass completes.
- An allocation that does not fit still aborts the instance; there is no `ErrorCode` for it (#56).

## 15. Containers (#48)

- **`bzip2` 0.6, not `bzip2-rs`** — its default backend is a Rust rewrite, and `bzip2-rs` had not
  released in five years. Both decoders together cost ~0.09 MB of binary.
- **`ruzstd` stops at the end of the first frame**; `expand_zstd` loops until the input is consumed.
- **Reserve the frame's declared size** — doubling growth peaked at 792 MB, reserving at 617 MB. A
  declared size over 1.5 GiB is refused before allocating (an OOM aborts WASM).
- **The compressed copy is freed before the passes** — `decompressed` takes the file by value.
- **A failed decompression is `TRUNCATED_DEMO`** — a decoder cannot tell a cut download from
  corruption, and the first is commoner. `.dem.gz` is `UNSUPPORTED_CONTAINER`.
- Container output is byte-identical to the expanded file's.

## 16. The parse budget, measured (#59)

Method for any parse timing: headed Chrome, built bundle via `wrangler dev`, binary hashed against
`pkg/`, the demo staged in OPFS and handed over as a `File`, `visibilityState` asserted in every run,
timed **from the drop** to the review screen, three runs per arm, arms interleaved in one hour.

- Worker spawn + `init()` is 0.08 s cold — negligible.
- **A hidden tab parses ~5× slower** (Chrome moves it to efficiency cores); the parse screen says so.
- **`-O3` over `-Oz`** is ~25–28% faster for +0.4 MB; decided 7 August 2026, shipped in #66.

## 17. The props schema 4 needed (#136)

- **The active weapon is `weapon_name`**. `active_weapon_name` silently produces nothing (§5's trap).
- **`inventory_as_bitmask` is broken for knives** (definition indices up to 526 shift out of a `u64`);
  use `inventory_as_ids`.
- **`item_equip.item` collapses weapons** — M4A4 and M4A1-S are both `m4a1`.
- **Vocabularies differ**: `weapon_name` gives display names (`AK-47`), kills and damage give internal
  names (`ak47`), `weapon_fire` gives `weapon_ak47`. `ENTRY_BY_INTERNAL_NAME` in `demo-core` bridges
  internal → display; #53 is the canonical enumeration.
- Armour is `m_ArmorValue`, helmet `CCSPlayer_ItemServices.m_bHasHelmet`.

## 18. Gunfire (#163)

`weapon_fire` (4,788) counts guns, grenade throws and knife swings; **`fire_bullets` (3,500) counts
trigger pulls with a gun** and carries `item_def_index`, which resolves through the same per-match
weapon table as `TickTrack.weapon` — so `Shot.weapon` is an index, not a sixth vocabulary. Per-weapon
counts agree exactly between the two (one Glock-18 excepted). Whether a shotgun's pellets are one event
is unverified (#230). Shots are a plain sorted array; the volume did not justify columns.

## 19. What ends an area grenade (#173, #367)

- **A smoke still standing when its round is cleaned up gets no `smokegrenade_expired`** (11 of 136).
  The projectile *is* the cloud, and for all 125 that do have the event, `expired.tick = last_sample + 1`.
  So expiry is read off the trajectory for every smoke — exact, not a nominal duration.
- **`decoy_detonate` is the decoy's end**; its start is `decoy_started`.
- **A fire burning at round cleanup has no `inferno_expire`** (1 of 84 on inferno). Its flames are a
  separate entity, so its end is the round's `round_officially_ended`. No duration is assumed. A demo cut
  off mid-fire keeps `expiry: null`.
- The fixture test asserts that no detonated area grenade lacks an expiry, and none ends before it begins.

## 20. A trajectory is the projectile's whole life (#176)

A trajectory samples the entity for as long as it exists, not only in flight. After detonation a smoke
lives a median 22.0 s, an HE exactly 5.0 s, a decoy 14.9 s; flashes and fire projectiles end within
0.1 s. The schema has no end-of-flight index: `trajectoryClipCount` clips at `detonationTick`, and
`flightEndTick` falls back to the last sample only when detonation is `null`.

## 21. Where a round's length comes from (#295)

- **Convars arrive as `server_cvar` game events** (72 variables), and only when `wanted_events` includes
  them. `DemoOutput.convars` is initialised and never written.
- **A convar can be set twice** (`mp_roundtime_defuse` 2 at tick −1, then 1.92 at match start), and which
  `mp_roundtime*` applies depends on the map type — so the crate does not read them.
- **`CCSGameRules.m_iRoundTime`** via `wanted_other_props` is the engine's own answer in seconds, stored
  per round at freeze end and nullable. It is not in `TICK_PROPS`, so a demo without it still parses.
- **`mp_c4timer` is not broadcast.** `bomb_exploded` lands exactly 2,624 ticks (41.00 s) after its plant,
  3 of 3. It is joined **by time, never by round** — one explosion came after its own `round_end`. With no
  explosion in a match the product falls back to 40 s.

## 22. Where a bullet went (#318)

- **There is no `bullet_impact` in a GOTV recording** — `game_events_counter` (a census taken before
  filtering) lists 54 names without it. A tracer is therefore a fixed-length ray, labelled as such.
- **`fire_bullets` carries exact angles** (`angles_x/y/z`) and muzzle position on every shot. Only yaw is
  kept: the muzzle is within 8.5 units of the player in plan, pitch is near level.
- The 16 Hz sampled yaw is off by p50 0.16°, max 15.7°; the exact angle was bought with `SCHEMA_VERSION` 8.
- **Event angles can leave −180..180** (down to −183.33); `scaled_angle` wraps both sources.
- At most 8 tracers stand on any frame, and no player fires twice in one tick.

## 23. Smoke and fire carry no shape or spread (#320)

`inferno_*` positions never move (0.00 units over 114 fires), and a settled smoke cloud does not move
either. Bodies and growth are **the product's model** (`grenade-state.ts`, `utility-body.ts`, seeded
deterministically), not demo data. At most 8 areas stand at once. Trust individual trails over
aggregates: a settle detector assuming 16 Hz on per-tick data reported a 162-unit drift that did not exist.

## 24. `dmg_health` is the shot, not the health lost (#287)

`Damage.healthDamage` is raw weapon damage and is not clamped — one AWP headshot reads 452. An
armour-only hit reads 0 health damage. Clamp or show it only while the victim is alive; damage is per
victim, whoever fired.

## 25. Two passes (#355)

The `event_with_velocity` flag (§3) lets `match_pass` carry `wanted_events: ["all"]` beside `TICK_PROPS`
with no change to `vendor/`. `velocity` is now structural: without it the merged pass collects no
columns and `Ticks::of` fails loudly. Upstream copies every wanted player prop into each event
(`user_*`, `attacker_*`), which nothing reads. The tick table is released with `mem::take` before the
projectile pass. The whole `ParsedDemo` hashes identically before and after on two demos.

Cost against three passes: browser 15.72 → **13.45 s** on the container fixture; native 8.99 → 7.52 s;
WASM peak linear memory 849 → **897 MiB** (the events' copies of tick props).

`cargo fmt --all` also reformats `vendor/` (it follows path dependencies) — commit vendored diffs as
additions only.
