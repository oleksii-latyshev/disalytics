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
| C — projectiles | `parse_projectiles: true`, `parse_grenades: false` | 301,488 trajectory samples, in `df` and **not** in `output.projectiles` — see §13 | 0.49 s |

Total 1.72 s natively multi-threaded. §7.2 asks for "as few passes as possible" and asks for the
number to be recorded — the number is **3**, and reducing it means patching upstream, not
configuring it.

---

## 4. Schema coverage against §10

| Group | Status | Source |
|---|---|---|
| **Kills** | extractable | `player_death`: `attacker_*`, `user_*` (victim), `assister_*`, `weapon`, `headshot`, `penetrated` (wallbang), `thrusmoke`, `noscope`, `attackerblind`, `distance`, `dmg_health`, `dmg_armor`, `hitgroup`, `assistedflash`, `attackerinair`, `tick` |
| **Damage** | extractable | `player_hurt`, 913 occurrences on the fixture |
| **Grenade trajectories** | extractable | pass C, sampled **every tick**, with thrower steamid and name. Read from `df`, not from `output.projectiles` — §13 |
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
- Whether the profiling timestamps can be fixed upstream rather than carried in `vendor/`
- Budget figures re-measured on CI hardware rather than a laptop
- What "slower hardware" is, concretely. §16 bounds it at 5× by confining the browser to efficiency
  cores, but nothing has run on a machine that is actually slow
- Naming a bombsite A or B, which needs `packages/map-data` — §13
- Whether `bomb_abortplant` occurs at all; like `bomb_abortdefuse` it is absent from this fixture,
  so the plant window that reads it has never been exercised

---

## 12. Found while adopting it (#46)

### A file shorter than the header panics

`first_pass/parser.rs` slices `demo_bytes[..HEADER_ENDS_AT_BYTE]` on the first line of
`parse_demo`, one line before `handle_short_header`'s own `bytes.len() < 16` check can fire. Any
file under 16 bytes panics rather than erroring, and that check is unreachable.

This is not cosmetic. §8 above records that an aborted instance is poisoned permanently, and the
release profile builds with `panic = "abort"` — so a 12-byte file would kill the worker instead of
producing an error screen. `crates/demo-parser` guards the length before handing bytes over rather
than patching the vendored copy: never crashing on a malformed file is our contract, and keeping
the guard on our side keeps it in front of the tests that own it.

### No demo fixture can be committed, so the tests drive the parser without one

`AGENTS.md` §18 forbids committing a `.dem` and §15 rules out Git LFS, which leaves the question of
how small a real one could be. Upstream's own fixture is 60 MB. There is no such thing as a
kilobyte-scale CS2 demo: a GOTV recording carries the send tables, the string tables and the game
event list before a single tick, so even a few seconds of play is megabytes.

`crates/demo-parser` therefore tests against synthetic byte sequences — a wrong magic, the Source 1
magic, a file shorter than the header, and Source 2 magic over noise. These are not mocks: every one
of them runs `Parser::parse_demo` for real and asserts the `ErrorCode` it produces. They cover the
whole of `AGENTS.md` §7.1's "handle gracefully, never a crash" list except the POV case, which needs
a real POV recording to tell apart.

A real demo arrives the way §18 prescribes, with the golden snapshot that the three-pass extraction
will need. This section originally read "fetched from a GitHub Release"; #49 settled it the other
way. Publishing a GOTV recording means publishing ten players' names and SteamIDs, and a project
whose first hard rule is that no server touches a demo should not keep one on a release page. The
fixture is named by `DISALYTICS_FIXTURE_DEMO` instead — see §13.

### The generated protobuf code did not need generating

§5 recorded that the build clones `GameTracking-CS2` and needs `protoc`, and treated pre-generating
that code as work Phase 2 would have to do. It does not: upstream commits `csgoproto/src/protobuf.rs`,
`csgoproto/src/maps.rs` and `csgoproto/src/message_type.rs` at the pinned revision, and only the
`GameTracking-CS2` checkout is gitignored. Deleting both build scripts is the whole fix, and it
keeps `prost-build` and its 18 further packages out of the graph. `vendor/README.md` has the detail.

---

## 13. Found while extracting the schema (#49)

Everything below was measured against the same fixture §2 describes, driving
`crates/demo-parser` rather than a probe.

### `DemoOutput.projectiles` is always empty — trajectories live in the table

`projectile_records` is initialised to `vec![]` at the pinned revision and never pushed to.
`collect_projectiles` writes into `self.output`, the same `df` the tick pass uses, under
`GRENADE_X`/`GRENADE_Y`/`GRENADE_Z`, `GRENADE_TYPE_ID`, `ENTITY_ID_ID`, `STEAMID_ID`, `NAME_ID` and
`TICK_ID` — the eight columns §8 counted.

Both threading modes were re-run to be sure: `output.projectiles` is empty in each, and the `df` is
identical in each — 301,488 rows, 385 distinct entities, entity 98 opening at tick 6,920 with
`x = -490.78`, which is the sample §4 prints. The threading discrepancy §7 records is real for
events and does **not** extend to projectiles.

### Projectile entity indices are recycled inside a match

385 distinct entity indices carry 519 flights. A flight is therefore keyed by index *and* by the
tick its samples started, split wherever the gap between consecutive samples exceeds 8 ticks —
upstream samples a projectile every tick it exists, so any real gap means a different object.

519 is not an estimate. `weapon_fire` on the same demo counts 153 HE, 136 smoke, 112 flashbang,
68 molotov, 49 incendiary and 1 decoy, and the extracted grenades match every one of those six
numbers exactly.

### A molotov and an incendiary are the same projectile class

Both arrive as `CMolotovProjectile`; `m_bIsIncGrenade` lives on the entity but upstream does not
expose it. The type is resolved from the thrower's most recent `weapon_fire` — `weapon_molotov`
against `weapon_incgrenade` — which is what produces the 68/49 split above.

Molotov detonations also cannot be joined by entity index: the flames are a separate `inferno_*`
entity. They are matched by thrower and time instead, and `inferno_expire` then joins the inferno's
own index.

### `player_death.distance` is in metres

A Source unit is one inch, so a metre is 39.3701 of them. Computing the distance between attacker
and victim from the tick pass at each death tick and dividing gives a median of **39.366** over the
219 kills that have both endpoints — the outliers are point-blank knife kills where the engine's own
measurement and the sampled positions disagree by a few units. `distanceUnits` in the schema is the
field multiplied by 39.37008.

### The bombsite has no name in the demo

`bomb_planted.site` is the bombsite trigger's entity index — 301 and 309 on this fixture, stable
across the 22 plants. `CCSGameRulesProxy.CCSGameRules.m_iBombSite` reads **0 at every one of them**
and is no help. Naming a site A or B needs the site polygons that `packages/map-data` will carry in
Phase 3, so the parser emits `siteEntityId` and `demo-core` lost `BombSite`/`BOMB_SITES` until then.

### The demo does not report its tick rate

The header has no field for it, `sv_tickrate` is not among the convars a GOTV recording carries, and
`m_fRoundStartTime` drifts against the tick counter badly enough to derive **59** from it. The rate
is the constant 64, cross-checked against the one round that ended on the clock: 140,008 to 147,368
is 7,360 ticks over a 115-second round, which is 64.0 exactly.

### The fixture plays 30 rounds, not the 32 §2 records

There are 32 `round_end` events, and §2 counted those. Two are warmup: one at tick 1 with no winner
at all, one at 4,296 before `begin_new_match` at 4,951. Rounds are assembled from `round_end` after
that boundary — 30 of them, MR12 plus one overtime, with side swaps at rounds 13 and 28.

That second swap is why a pistol round is not simply the first round of a half: overtime halves swap
sides too and open on $10,000, and every player at round 28 is holding 5,100 or more.

### Parse cost is dominated by the release profile, not by the extraction

| build | three passes + columnar write |
|---|---|
| `opt-level = 3` | **6.82 s** |
| `opt-level = "z"` — what this repository ships | **11.5–12.3 s** |

§9 measured 6.66 s for the three passes alone, natively single-threaded, on a normal release build.
So the whole of the columnar write, the event mapping and the trajectory grouping costs roughly
**0.2 s** — and `-Oz`, which `AGENTS.md` §16 chose for the 4 MB binary budget, costs **1.8×**.

This matters because §9's browser figure of 10.4 s was taken at `-O`, not at `-Oz`. Scaling it by the
same factor lands near 19 s against a 15 s budget. That is an extrapolation and not a measurement —
the honest number needs the worker from #50 — but the budget and the profile were set from different
builds and the gap is now on the record.

### Running it

The demo is named by an environment variable and never committed (`AGENTS.md` §18):

```sh
DISALYTICS_FIXTURE_DEMO=/path/to/demo.dem cargo test -p demo-parser --test fixture
```

Without it the test reports itself skipped. `DISALYTICS_UPDATE_SNAPSHOT=1` rewrites
`crates/demo-parser/tests/snapshots/parsed-demo.json` instead of comparing against it; the diff is
read by a human before it is committed, never accepted because a test asked for it.

The snapshot carries every round and plant and defuse in full, the ends of the longer lists with an
FNV-1a checksum over the whole of each, per-column checksums of `TickTrack` with every 6,000th frame
written out, and the grenade counts per type that the `weapon_fire` cross-check above compares
against.

### `player_first_connect` deduplication is not needed

§7 asks for it so output does not depend on which threading branch ran. Connect events are not part
of the §10 schema and never reach parsed output, so there is nothing to deduplicate. The point stands
if that schema ever grows a roster timeline.

---

## 14. The WASM boundary (#50)

`crates/demo-parser-wasm` hands the parsed demo to JavaScript as plain objects and typed arrays,
built with `js-sys`. Three things about that were decided rather than fallen into.

### Why not JSON

`serde_json` would carry the event lists in a few lines. It cannot carry `TickTrack`: a 40-minute
match at 16 Hz is ~384,000 cells per column, and eight columns of that as JSON text is tens of
megabytes to serialise and then parse back into the wrong type — `number[]`, not `Float32Array`.
Grenade trajectories have the same problem, 519 of them. A JSON route therefore needs a typed-array
route beside it for the parts that matter, and once both exist the JSON half only adds a dependency.

`js-sys` adds no crate to the graph: `getrandom`'s browser opt-ins already link it, which is why the
`Cargo.toml` comment says so and hard rule 10 is not in play. It costs **0.13 MB** of binary —
2.00 MB before #50, 2.13 MB after.

### Every buffer is JavaScript's, not a view into linear memory

`Float32Array::from(&vec[..])` copies out of WASM memory into a fresh, JavaScript-owned array. A
view would be cheaper and wrong three times over: it cannot be transferred, it dangles the moment
the worker is terminated, and it reports the module's whole heap as its `buffer`. `bun run
wasm:smoke` asserts `buffer.byteLength === byteLength` on every column for exactly that reason.

### The demo goes in a chunk at a time

`parse(&[u8])` would have `wasm-bindgen` copy the file out of a JavaScript `ArrayBuffer` into linear
memory, holding ~350 MB twice at the peak. `DemoBuffer` reserves the file's size up front and takes
the chunks a `ReadableStream` yields, so only the chunk in flight is duplicated. The buffer is then
consumed by value and dropped before any of the output is allocated.

An allocation that will not fit still aborts the instance. There is no `ErrorCode` for it — see #56.

### Progress is per pass, and that is the honest limit

Upstream exposes no hook inside a pass, so `ParseObserver` reports at the three boundaries and the
worker turns that into 33 / 67 / 100. The header is reported separately because it is complete after
the second pass while the third is still running; `crates/demo-parser/tests/fixture.rs` asserts that
ordering, since a header that arrives with `done` is a header not worth a message.

### Parse cost of the binary that ships — 13.89 s, and what that is not

`DISALYTICS_FIXTURE_DEMO=… bun run wasm:smoke` drove the shipped `-Oz` binary over the 353 MB
fixture: **13.89 s**, three passes, columnar write, marshalling and all, `de_dust2`, 486,350 track
cells and 519 grenade flights — the same 519 the `weapon_fire` cross-check in §13 counted.

This is the first number taken from WASM rather than from native, and it retires the 19 s figure
§9 arrived at by multiplying 10.4 s by the 1.8× that `-Oz` costs *natively*. WASM does not pay that
multiplier the way native does.

It is **not** the §16 budget met. Bun's engine is not a browser's, nothing here ran inside a
`Worker`, and the machine is a developer laptop rather than the slow hardware the 15 s has to cover.
#59 is still the honest measurement, and it needs the consumer #52 wires.

### First numbers from an actual browser (#52), and why they are not #59 either

Driving the shipped build through workerd in Chrome over the same 353 MB fixture, from the drop to
the summary, with the file already resident as a `Blob`:

| | elapsed |
|---|---|
| first `progress` | 0.2 s |
| pass 1 done — 33% | 4.6 s |
| pass 2 done — 67% | 10.7 s |
| `header` on screen | 11.1 s |
| `done` | **15.3 s** |

The header landing 0.4 s after the second pass, while the third still runs, is the ordering §14
argues for and `crates/demo-parser/tests/fixture.rs` asserts — observed here rather than inferred.

**15.3 s is at the budget, not inside it**, and it is 1.4 s above the 13.89 s Bun measured. It is
still not the measurement: the demo was fetched over HTTP into a `Blob` rather than picked off disk,
the tab was driven by automation, and nothing was controlled for. #59 remains what settles the
budget — this is the first evidence that it is worth doing carefully rather than a formality.

---

## 15. Containers (#48)

`.dem.zst` from FACEIT and `.dem.bz2` from Valve matchmaking are expanded inside
`crates/demo-parser`, before upstream sees a byte. `AGENTS.md` §7.1 settled the placement; what
follows is what building it found.

### The decoder is `bzip2`, not `bzip2-rs`

§7.1 named `ruzstd` and `bzip2-rs`, and the reasoning behind the second one has expired.
`bzip2-rs` was the pure-Rust decoder because the `bzip2` crate meant C bindings. Since `bzip2` 0.6
its default backend is **`libbz2-rs-sys`**, a Rust rewrite, so the C toolchain the rule was
protecting against is no longer what that crate implies. The measured difference:

| | packages added | wasm-opt `-Oz` | last release |
|---|---|---|---|
| `ruzstd` + `bzip2-rs` | 5 | 124.5 kB | Feb 2021 |
| `ruzstd` + `bzip2` 0.6 | 4 | 119.6 kB | May 2026 |

Five and a half years without a release, on the code that reads a hostile file first, is what
decided it. Neither route pulls `wasm-bindgen`, `js-sys`, `web-sys`, a build script or a
proc-macro, and `#![forbid(unsafe_code)]` on `crates/demo-parser` is untouched either way — it
covers this crate, never its dependencies.

The shipped binary went **2.13 MB → 2.22 MB**, below the 119.6 kB the isolated probe predicted
because `std`'s machinery was already linked.

### `ruzstd` decodes one frame, and an archive may hold several

`StreamingDecoder::read` returns `Ok(0)` at the end of the *first* frame rather than continuing to
the next, and the format allows any number of them. Left alone that hands back a prefix of the
demo, which reads downstream as a recording that stops early — a wrong error about a file that is
perfectly good. `expand_zstd` therefore loops, building a new decoder per frame until the source is
consumed. Skippable frames are not handled; they do not occur in a demo download and would need
byte accounting the crate cannot check against a real file.

### The frame's declared size is what keeps the peak flat

`FrameDecoder::content_size()` reports the frame's uncompressed length, and reserving it up front
is worth more than it looks. Growing a 353 MB buffer by doubling holds the old and the new
allocation at once — 792 MB, on top of the 264 MB compressed file still in memory. Reserving once
makes the same work peak at **617 MB**, under the 663 MB the parse itself reaches. A frame that
declares nothing falls back to growth; a frame that declares more than the ceiling is refused
before anything is allocated.

That ceiling is 1.5 GiB, and it is a guard rather than a policy: `wasm32` aborts the instance on a
failed allocation instead of returning, so a stream claiming to expand forever has to be refused
rather than attempted.

### The compressed copy is freed before the passes, not after

`demo_parser::decompressed` takes the file **by value** and the WASM wrapper hands it `DemoBuffer`'s
own `Vec`. The compressed quarter-gigabyte is released as that call returns, so the two copies
overlap only while the container is being expanded — they do not ride along through all three
passes. `parse`/`parse_observed` keep a borrowing path for callers who do not own their bytes, and
a raw `.dem` is passed through untouched by both.

### A failed decompression is `TRUNCATED_DEMO`, deliberately

A decoder cannot tell a download that stopped early from a corrupted one, and the first is much the
commoner. The alternative code, `MALFORMED_DEMO`, renders as *"The file is a Counter-Strike 2 demo,
but the recording is damaged"* — a claim nothing has earned while the container is still shut. Both
messages send the reader to re-download; only one of them avoids asserting something unknown. #56
owns the vocabulary this is working around.

`UNSUPPORTED_CONTAINER` is now reachable, and gzip is what reaches it: `.dem.gz` is identified and
named rather than parsed. Before this, a `.dem.zst` failed as `NOT_A_DEMO` — upstream rejected the
zstd magic as `UnknownFile` — so a good FACEIT download was told it was not a demo.

### What it costs — 2.78 s, and the budget does not have it

`DISALYTICS_FIXTURE_DEMO=… bun run wasm:smoke` over the same fixture, on the same binary, on the
same machine, one run each:

| input | elapsed |
|---|---|
| `demo.dem`, 353 MB raw | 13.92 s |
| `demo.dem.zst`, 264 MB compressed | **16.70 s** |

Both produced `de_dust2`, 486,350 track cells and 519 grenade flights — the container path is
output-identical, not merely close. The 13.92 s also confirms the decoders cost nothing on a raw
demo: §14 measured 13.89 s before they existed.

**Decompression is therefore 2.78 s, and §16's 15 s budget has no room for it.** The browser number
for the *raw* fixture is already 15.3 s, so a FACEIT `.dem.zst` lands around 18 s on the same
hardware. That is not a regression this issue introduced — the file could not be opened at all
before — but it is the budget failing for the input most users actually have, and #59 now has to
measure both containers rather than one.

The fixture test was also run against the `.dem.zst` directly and reproduced the committed golden
snapshot for the raw demo byte for byte, twice over: identification, expansion and parsing produce
the same output as the file that was expanded on the command line.

---

## 16. The parse budget, measured (#59)

`AGENTS.md` §16 budgets a 300 MB demo at 15 s. Every earlier figure was taken somewhere other than
where that claim lives — natively (§9), from Bun (§14), or through a tab whose state nobody checked
(§14 again). This is the measurement the budget is now written from.

### How it was taken

Chrome 150, headed, one tab, `document.visibilityState` asserted `visible` inside every run. The app
is the shipped build served by `wrangler dev` out of `apps/web/dist`, and its binary was hashed
against `crates/demo-parser-wasm/pkg` before the first run — timing an artifact nobody confirmed is
§8's mistake a second time.

The demo is staged into **OPFS** and handed to the app as the `File` that
`FileSystemFileHandle.getFile()` returns, so the worker's streaming read comes off disk instead of
out of a `Blob` the page is already holding. §14 named that `Blob` as one of three reasons not to
trust its number. It turned out to be worth nothing at all — 15.29 s off disk against the 15.3 s
§14 measured out of memory — but it was worth removing to find that out.

Timing is a `MutationObserver` over the app's own DOM: the progress bar's `aria-valuenow`, the phase
label, the header block, the summary. The clock therefore reads the milestones a person watching the
screen reads, and no polling loop runs against the tab. **The interval is the drop to the summary**,
which is the whole of what a user waits through.

### The numbers — three runs each, idle machine

| input | runs | mean |
|---|---|---|
| `demo.dem`, 353 MB raw | 15.49, 15.16, 15.22 | **15.29 s** |
| `demo.dem.zst`, 264 MB | 18.80, 18.85, 18.91 | **18.85 s** |

Every run produced `de_dust2`, 10 players, 30 rounds, 225 kills and 519 grenades — the container
path is output-identical in a browser too, not only under Bun (§15).

Where the time goes, taken from the middle run of each:

| milestone | raw | `.zst` |
|---|---|---|
| read into linear memory | — | 0.16 s |
| pass 1 — 33% | 4.33 s | 8.01 s |
| pass 2 — 67% | 10.44 s | 14.13 s |
| header on screen | 10.67 s | 14.34 s |
| pass 3 — 100% | 15.11 s | 18.80 s |
| summary | 15.16 s | 18.85 s |

**The container costs 3.56 s**, against the 2.78 s §15 measured under Bun. The read itself is 0.16 s
for 264 MB, which is why the raw demo does not bother reporting one.

### Two questions §14 left open, answered

**Measure from the drop, not from the first `progress`.** Dropping a 1 KB file and waiting for the
error screen times worker spawn, `init()` and the rejection together: **0.08 s** on a cold profile,
0.03 s warm. §14 attributed 0.2 s to instantiating the binary; whatever the true split, it is under
1% of the budget and cannot decide anything. The drop is what the user starts waiting at.

**"Slower hardware" cannot be emulated with the tooling to hand.** `Emulation.setCPUThrottlingRate`
at rate 4 leaves the figure at 15.64 s against 15.29 s unthrottled: CDP's throttle reaches the main
thread and not a dedicated worker, so it cannot say anything about a parse. What *can* be said is
what the same machine does at background QoS — `taskpolicy -b`, which on Apple silicon confines the
process to efficiency cores:

| input | efficiency cores | ratio |
|---|---|---|
| `demo.dem` | 76.4 s | 5.0× |
| `demo.dem.zst` | 98.6 s | 5.2× |

That is a lower bound on hardware, not a model of it, and no build in this repository covers a 5×
machine inside 15 s. The budget's "headroom covers slower hardware" has never been true and is not
made true here.

### A backgrounded tab parses five times slower

The first attempt at this measurement ran in an embedded browser pane and produced 87.0 s and
82.7 s for the raw demo. Nothing was wrong with the machine — Bun parsed the same binary in 14.22 s
the same afternoon, against the 13.92 s §15 recorded. The tab reported `document.hidden === true`,
and Chrome drops a hidden tab's renderer to background priority, which lands it on the same
efficiency cores as the table above.

This is a product fact and not only a measurement trap: **a user who switches away mid-parse waits
roughly five times longer.** Nothing in the app can prevent it, and nothing currently says it.

### `-Oz` misses the budget on both inputs; `-O3` meets it on both

`-Oz` was chosen for the 4 MB binary cap (§8, `Cargo.toml`), and the cap has 45% of itself unused
while the time budget has none. Rebuilding at `opt-level = 3` and `wasm-opt -O3`, everything else
held:

| build | raw `.dem` | `.dem.zst` | binary | of the 4 MB cap |
|---|---|---|---|---|
| `-Oz` — what ships today | 15.29 s | 18.85 s | 2.22 MB | 55.5% |
| `-O3` | **11.11 s** | **14.19 s** | 2.62 MB | 65.6% |

`-O3` is 27% faster on the raw demo and 25% on the container, for 0.40 MB. It is the only
configuration measured in which **both** §16 budgets hold at once.

**Decision: switch the release profile to `-O3`**, taken by the repository owner on 7 August 2026
against these numbers. The 15 s budget stands as written; the profile moves to meet it. The change is
**#66** rather than part of this measurement, because a profile that decides both budgets deserves
its own diff.

Until #66 lands, the shipped `-Oz` build is over budget on the raw demo by 0.3 s and on the container
by 3.9 s.
