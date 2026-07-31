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
- Force `ParsingMode::ForceSingleThreaded` on the WASM path — `SharedArrayBuffer` is rejected (§3)
  and COOP/COEP are forbidden (§13), so there are no threads to use. See §8 for what actually
  blocks the browser build, which is not what was expected.

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

## 8. The browser build

Verified by building the parser for `wasm32-unknown-unknown` and running all three passes in a Web
Worker against the same fixture, served over `http://127.0.0.1`.

### Verdict

**It builds, it runs, and it fits the budget** — but only after a patch to upstream. The blockers
were not the ones expected.

### `rayon`, `memmap2` and `libc` are not blockers

All three compile for `wasm32-unknown-unknown` without complaint. The concern recorded before this
check was wrong, and is corrected in §6. They are still a reason to pin
`ForceSingleThreaded`, because rayon's threads cannot run in the browser — but they do not stop the
build.

### What actually blocks it: `std::time::Instant::now()`

`wasm32-unknown-unknown` has no clock, and `Instant::now()` compiles to an `unreachable` trap.
`Parser::parse_demo` calls it unconditionally on its second line, and
`second_pass_single_threaded` — the path we are forced onto — calls it again:

```rust
let _prof = std::env::var("CS2_PROF").is_ok();
let _t = std::time::Instant::now();   // traps in the browser
```

Both are leftovers from upstream's profiling work. Every other `Instant::now()` in the parser is
already lazy (`prof_on().then(std::time::Instant::now)`) and therefore harmless. Making these two
lazy in the same style is the whole fix — a two-line change, carried as a patch on the pinned
revision.

### The trap that hid the trap

**A binary whose entry point traps early gets its unreachable code eliminated, and then measures
tiny.** Before the patch, the optimiser saw `unreachable` at the top of `parse_demo`, concluded
everything downstream was dead, and produced a 293 KB artifact that gzipped to 16 KB. That number
looked like a spectacular result against the 4 MB budget. It was a binary with no parser in it.

A size measurement taken from an artifact that has never successfully run is worthless. Measure
after a green run, never before.

### Size, measured after `wasm-opt` on a build that works

| | bytes | |
|---|---|---|
| raw | 2,285,183 | 2.18 MB |
| gzip -9 | 654,603 | 0.62 MB |
| brotli -q 11 | 478,028 | 0.46 MB |

Against `AGENTS.md` §16 — under the 4 MB target at **54% of budget**, far under the 24 MB CI gate.
The §19 pass condition is met.

### Output parity with native

The three passes produce byte-identical counts to a native `ForceSingleThreaded` run:

| | native ST | browser |
|---|---|---|
| events total | 32,435 | 32,435 |
| `player_first_connect` | 67 | 67 |
| pass B columns × rows | 16 × 1,945,210 | 16 × 1,945,210 |
| pass C columns × rows | 8 × 301,488 | 8 × 301,488 |

This also **confirms the prediction in §7**: the browser sees 67 `player_first_connect` events, not
the 10 a native `Normal` run produces. The threading discrepancy is real and reaches the product.

### Timings from this check were wrong — see §9

An earlier revision of this section reported 44 s for three passes and concluded the parse-time
budget was missed. **That measurement was contaminated** — it was taken while `cargo` and
`wasm-pack` builds were running on the same machine. Re-measured on an idle machine the same work
takes ~10.4 s, and the figure reproduces to within 1.5%.

The retraction is kept rather than quietly deleted because the failure is instructive: the bad
number survived a "verification" that reran it under `-O3` and got 43.9 s, which looked like
independent confirmation and was really the same contamination twice. Two agreeing measurements
taken under the same broken conditions agree about nothing.

§9 has the real figures.

### `only_header` does not short-circuit

`only_header: true` takes essentially as long as a full pass — 3.1 s against 3.0 s for the events
pass — and still produces three prop columns with 1,945,210 rows. It does not stop after the
header. Reading a demo's map and tick rate cheaply, which the library screen needs, requires
something other than this flag.

### An aborted instance is poisoned

Once any call traps, **every subsequent call into the same instance traps too**, including calls
that had worked moments earlier. There is no recovering an instance after an abort. This is why the
first attempt appeared to fail in all four passes when only the first one had really failed.

For §7.3 this means an abort is not a catchable error: the worker must be terminated and recreated,
which is the same lifecycle cancellation already requires.

### Build requirements

Two `getrandom` majors coexist in the tree and each needs its own opt-in:

```toml
getrandom_02 = { package = "getrandom", version = "0.2", features = ["js"] }
getrandom_03 = { package = "getrandom", version = "0.3", features = ["wasm_js"] }
```

plus `RUSTFLAGS=--cfg getrandom_backend="wasm_js"`. The 0.3 copy arrives through `ahash`, not
directly.

---

## 9. Parse cost

Measured on an idle machine. Every browser figure is the mean of two runs that agreed to within
1.5%; the native figures are single runs of a much less variable workload.

### Time

| pass | native, multi-threaded | native, single-threaded | browser |
|---|---|---|---|
| A events | 0.46 s | 1.93 s | 2.96 s |
| B per-tick props | 0.70 s | 2.53 s | 4.26 s |
| C projectiles | 0.53 s | 2.11 s | 3.14 s |
| **three passes** | **1.97 s** | **6.66 s** | **10.4 s** |

Copying the 353 MB fixture across the WASM boundary costs 39–84 ms and is not a factor.

### Where the time goes

The browser is 5.3× slower than a native multi-threaded parse, and that splits cleanly:

- **losing threads costs 3.4×** — 1.97 s to 6.66 s, both native. This is the larger factor and it is
  not recoverable: `SharedArrayBuffer` is rejected (§3) and COOP/COEP are forbidden (§13), so WASM
  threads are off the table by decision, not by accident.
- **WASM itself costs 1.6×** — 6.66 s to 10.4 s, both single-threaded. For a parser that is
  bit-twiddling in a tight loop, a 60% penalty against native is unremarkable and leaves little to
  win back.

The useful consequence: **there is no large, cheap optimisation waiting here.** Anything that
materially improves parse time has to reduce the work, not speed it up — fewer passes (blocked
upstream, §3), fewer props, or sampling rather than reading every tick.

### Memory

WASM linear memory across a three-pass parse, which never shrinks and so ends at its peak:

| after | linear memory |
|---|---|
| boundary copy of the demo | 339 MB |
| pass A events | 446 MB |
| pass B per-tick props | 663 MB |
| pass C projectiles | 663 MB |

Native peak RSS for the same work: 691 MB single-threaded, 927 MB multi-threaded — the parallel path
costs more because each second-pass worker builds its own output.

Two honest limits on this figure. **WASM linear memory is not tab memory**: it excludes the JS-side
`ArrayBuffer` holding the fetched demo, which is another ~353 MB before it is dropped. And
`performance.measureUserAgentSpecificMemory()`, the only API that reports true tab memory, requires
cross-origin isolation, which §13 forbids — so the honest whole-tab number cannot be taken under our
own constraints. Adding the JS buffer by hand puts a realistic peak near **1.0 GB**, inside the
§16 budget of 1.5 GB but not by a wide margin.

### §16 budgets, now set

§16 marked its parse-time figure provisional and asked Phase 0 to replace it. Applied:

| metric | was | now | reasoning |
|---|---|---|---|
| Parse a 300 MB demo | < 30 s | **< 15 s** | 10.4 s measured on 337 MB, a larger demo than the reference. 15 s leaves ~45% headroom for slower hardware and for the columnar write this probe does not do, while still catching a real regression. 30 s is loose enough to hide a 3× regression. |
| Peak tab memory during parse | < 1.5 GB | **unchanged** | ~1.0 GB estimated. Keep the margin; the estimate is not a measurement. |

The parse-time budget should be asserted against the same fixture on CI hardware, not a developer
laptop — the number will differ and the budget should be set from the CI figure once it exists.

---

## 10. Phase 0 verdict

All five §19 criteria, answered:

| question | pass condition | result |
|---|---|---|
| Parses a 400 MB demo in-browser? | completes without crashing | **pass** — 337 MB, three passes, no crash |
| Peak memory? | < 1.5 GB | **pass** — 663 MB in WASM, ~1.0 GB estimated whole-tab |
| Parse time? | < 30 s, record the real number | **pass** — 10.4 s; §16 now reads < 15 s |
| Full §10 schema extractable? | yes | **pass** — including grenade trajectories and per-player blind durations |
| Shipped WASM size? | < 4 MB | **pass** — 2.18 MB, 54% of budget |

**The Rust default is confirmed. Go is not needed and was never built.**

What Phase 2 inherits as known risk, all recorded above rather than discovered later:

- three passes are a floor imposed by upstream (§3)
- output differs between threading modes and must be normalised by us (§7)
- upstream must be pinned and patched — `lazy-instant.patch` — and its build reaches the network (§5, §8)
- unresolved prop names are dropped silently, so every request must be verified (§5)
- no large parse-time win is available without reducing the work (§9)

---

## 11. Still open

- A cheap way to read a demo's header, since `only_header` costs a full pass
- Whether `bomb_abortdefuse` behaves as expected — needs a demo containing one
- Whether the profiling timestamps can be fixed upstream rather than carried as a patch
- Budget figures re-measured on CI hardware rather than a laptop
