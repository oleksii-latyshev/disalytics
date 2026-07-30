# PARSER.md

Findings from Phase 0. This document records what `demoparser2` can and cannot produce, and the
constraints its design imposes on `crates/demo-parser`. Everything here was measured against a real
demo, not read from upstream documentation.

Scope note: this covers **schema extractability and query batching only**. Parse time, peak memory
in the browser, and shipped WASM size are separate Phase 0 questions and are not settled here. The
timings below are incidental context from a native multi-threaded run and are **not** budget
numbers.

---

## 1. Verdict

**The §10 event schema is extractable.** Both of the fields `AGENTS.md` §19 singled out as the
likeliest gaps — grenade trajectories and per-player blind durations — are present and complete.

The Rust default passes this Phase 0 criterion. Three findings change how it must be used, and one
is an upstream defect that our code has to work around.

---

## 2. What was tested

| | |
|---|---|
| Upstream | `github.com/LaihoE/demoparser`, rev `ba39cc44cd5abfd7f34df2b3c0a7dd3630048311` (2026-07-07) |
| Crate | `parser` 0.1.1 — **not published to crates.io** |
| Fixture | FACEIT GOTV demo, `de_dust2`, 353,144,958 bytes decompressed, 32 rounds, 194,521 ticks, 10 players |
| Host | macOS arm64, native, `--release`, `ParsingMode::Normal` |
| Probe | `tools/probes/schema-extraction` |

`demoparser2` is the name of the PyPI/npm binding, not of a Rust crate. The Rust crate is called
`parser`, lives at `src/parser` in that repository, and has to be consumed as a git dependency
pinned to a revision.

---

## 3. Query batching — the answer to §7.2

**A single pass cannot produce events, per-tick player props and projectile trajectories together.**
This is not a tuning choice; it is enforced by upstream control flow in
`second_pass/collect_data.rs::collect_entities`:

- if `wanted_events` is non-empty, entity collection returns early — so requesting events yields
  **no** per-tick props and **no** projectiles
- if `parse_projectiles` is set, `collect_projectiles()` runs and returns — so projectile sampling
  replaces player-prop collection rather than joining it

Measured on the fixture, requesting all three in one pass produced events only — 0 prop columns and
0 projectile records — exactly as the control flow predicts.

**The schema therefore requires three passes, and three is the floor, not a starting point:**

| Pass | `ParserInputs` | Yields | Time |
|---|---|---|---|
| A — events | `wanted_events: ["all"]` | 32,378 events across 54 distinct names | 0.52 s |
| B — ticks | player props, no events | 16 columns × 1,945,210 values, zero nones | 0.72 s |
| C — projectiles | `parse_projectiles: true`, `parse_grenades: false` | 301,488 trajectory samples | 0.49 s |

Total 1.72 s natively multi-threaded. §7.2 asks for "as few passes as possible" and asks for the
number to be recorded — the number is **3**, and reducing it means patching upstream, not
configuring it.

---

## 4. Schema coverage against §10

| Group | Status | Source |
|---|---|---|
| **Kills** | extractable | `player_death`: `attacker_*`, `user_*` (victim), `assister_*`, `weapon`, `headshot`, `penetrated` (wallbang), `thrusmoke`, `noscope`, `attackerblind`, `distance`, `dmg_health`, `dmg_armor`, `hitgroup`, `assistedflash`, `attackerinair`, `tick` |
| **Damage** | extractable | `player_hurt`, 913 occurrences on the fixture |
| **Grenade trajectories** | extractable | pass C, sampled **every tick**, with thrower steamid and name |
| **Grenade detonations** | extractable | `hegrenade_detonate`, `flashbang_detonate`, `smokegrenade_detonate`, `decoy_detonate`, each carrying `x`/`y` |
| **Grenade expiry** | extractable | `smokegrenade_expired`, `inferno_expire` |
| **Blinds** | extractable | `player_blind` carries `blind_duration: f32` **per affected player**, plus attacker identity. 237 occurrences |
| **Objectives** | extractable | `bomb_planted` / `bomb_defused` with `site: i32`, `bomb_begindefuse` with `haskit: bool`, `bomb_beginplant`, `bomb_exploded` |
| **Rounds** | extractable | `round_start`, `round_end` (`winner`, `reason`, `round`), `round_freeze_end`, `round_officially_ended` |
| **Economy** | extractable | props `m_iAccount`, `m_iEquipmentValue`, `m_iCashSpentThisRound`, `m_iTotalCashSpent`, and per-round `CSPerRoundStats_t.*` |
| **Victim blind at time of death** | **derived, not a field** | `player_death` has `attackerblind` but no victim equivalent. Derive from `m_flFlashDuration` at the death tick, or by joining `player_blind` |
| **Defuse abort** | **unconfirmed** | `bomb_abortdefuse` did not occur in this match. Absent from the fixture, not shown absent from the parser |

Trajectory sampling is per tick and smooth — a representative smoke projectile:

```
tick 6920  (-490.8, -205.8,  78.4)  CSmokeGrenadeProjectile
tick 6921  (-490.3, -196.9,  84.0)
tick 6922  (-489.9, -188.1,  89.5)
```

At 301,488 samples per match, trajectories must be downsampled or stored per grenade rather than
kept at full rate — a `TickTrack`-style concern for Phase 2, not a blocker here.

---

## 5. Defects and traps

### `*_grenade_type` on events is filled with the tick

When player props are requested alongside events, each actor on an event gains
`<actor>_grenade_type`. On the fixture **28,306 of 28,306** such fields were exactly equal to the
event's own tick. The field is unusable; grenade type must come from the projectile pass or from the
detonation event name. Do not read it, and do not map it into our schema.

### `parse_grenades: true` silently destroys trajectories

With `parse_grenades: true` the projectile pass also picks up inventory grenade entities
(`CSmokeGrenade`), and upstream only collects coordinates for classes whose name contains
`Projectile`. The result is a table with 2,921,567 rows whose X/Y/Z are entirely `None`. With
`parse_grenades: false` the same pass returns 301,488 rows with real coordinates.

**The flag that sounds like it enables grenades is the one that breaks them.**

### Lowercase position fields are always null

Events carry both `attacker_X`/`attacker_Y`/`attacker_Z` (populated) and
`attacker_x`/`attacker_y`/`attacker_z` (always `None`). Same for `user_*` and `assister_*`. Read the
uppercase set.

### Friendly prop names are not resolved by the core crate

`maps.rs` maps `health` → `CCSPlayerPawn.m_iHealth` and ~1,000 similar aliases, but
`Parser::parse_demo` does not apply it — the bindings do, via
`first_pass::parser_settings::rm_user_friendly_names`. Passing `health` to the core crate silently
produces **no column at all**: no error, no warning. Requesting 12 props yielded 10 columns until the
real paths were used, at which point all 13 resolved.

Silent omission of a requested field is the single most dangerous behaviour found. Our wrapper must
assert that every requested prop produced a column.

### Some props silently disable multi-threading

`check_multithreadability` scans requested props against `NON_MULTITHREADABLE_PROPS` — several
`CSPerRoundStats_t` counters and movement props including `m_bDucking` — and falls back to
single-threaded parsing without saying so. Swapping one such prop changed pass B from 2.39 s to
0.83 s. In the browser we are single-threaded regardless, so this costs us nothing there, but it
makes native benchmarks misleading unless the prop set is held fixed.

### The build clones a repository from the network

`csgoproto`'s build script clones `GameTracking-CS2` at build time and requires `protoc`. That is a
network dependency and an unpinned upstream inside our build — unacceptable for reproducible CI, and
it must be vendored or pre-generated before Phase 2.

---

## 6. Consequences for `crates/demo-parser`

- Vendor or pin `parser` by revision. There is no crates.io release to depend on.
- Generate protobuf code ahead of time; do not let a build script reach the network.
- Drive the parser with real prop paths, never friendly aliases, and **verify every requested prop
  produced a column**.
- Treat `*_grenade_type` on events as absent.
- Run the projectile pass with `parse_grenades: false`.
- Upstream pulls in `rayon`, `memmap2` and `libc`. None of those fit `wasm32-unknown-unknown` with
  `SharedArrayBuffer` rejected (§3) and COOP/COEP forbidden (§13). The WASM path must force
  `ParsingMode::ForceSingleThreaded` and avoid the memory-mapped entry points. Upstream ships a
  `src/wasm` binding, so this is known to be solvable — confirming it is the next Phase 0 question,
  not this one.

---

## 7. Determinism — single-threaded and multi-threaded output differ

Repeated runs in the same mode are stable. **The two threading modes are not equivalent**, and this
is the finding with the longest reach.

`second_pass_multi_threaded` post-processes its output with `remove_duplicate_player_connects`;
`second_pass_single_threaded` does not. Both apply the other two post-processing steps. Measured on
the fixture, events-only:

| | `Normal` (multi-threaded) | `ForceSingleThreaded` |
|---|---|---|
| total events | 32,378 | 32,435 |
| `player_first_connect` | 10 | 67 |

Every other event name matched exactly. The difference is entirely the un-deduplicated connect
events.

This matters because the mode is not always chosen deliberately. `check_multithreadability` drops to
single-threaded whenever any requested prop is in `NON_MULTITHREADABLE_PROPS`, silently — so the
event set can change as a side effect of adding a prop. And in the browser we are single-threaded
regardless, which means **the browser sees the 67-event shape while a native `cargo test` sees the
10-event shape.** Golden snapshots (§18) taken natively would not match browser output.

Consequences for `crates/demo-parser`:

- pin the threading mode explicitly rather than relying on `ParsingMode::Normal`
- deduplicate `player_first_connect` ourselves, so the result does not depend on which branch ran
- the prop set is part of the schema contract; changing it must bump `SCHEMA_VERSION`

Hard rule 8 is satisfiable here, but only because we normalise the output. It is not inherited from
upstream for free.

---

## 8. Open after this check

- Does the crate build and run under `wasm32-unknown-unknown` single-threaded, and at what size
- Parse time and peak tab memory in the browser
- Whether `bomb_abortdefuse` behaves as expected — needs a demo containing one
