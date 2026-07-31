# parse-cost probe

Throwaway Phase 0 code. It produces the native half of the cost measurement in `docs/PARSER.md` §9 —
the same three passes the browser probe runs, timed under both threading modes, so the browser
figure has a baseline to be compared against. Nothing in the build depends on it.

Unlike `../wasm-build`, this one needs no patch: the host has a clock, so the upstream revision runs
as published and is taken straight from git.

## Running it

```bash
brew install protobuf    # csgoproto's build script needs protoc

cargo run --release --manifest-path tools/probes/parse-cost/Cargo.toml -- \
  /path/to/demo.dem st all
```

Arguments are `<demo.dem> <st|mt> <events|ticks|projectiles|all>`. `st` forces single-threaded,
which is what the browser is limited to; `mt` forces multi-threaded. Neither uses
`ParsingMode::Normal`, because that mode picks a branch based on the requested props and the two
branches do not produce the same output — see `docs/PARSER.md` §7.

For peak memory, run one pass per process and let the OS report it:

```bash
/usr/bin/time -l cargo run --release --manifest-path tools/probes/parse-cost/Cargo.toml -- \
  /path/to/demo.dem st ticks
```

**Measure on an idle machine.** The first attempt at these numbers was taken while builds were
running and came out 4× too slow, which was believed for a day. See `docs/PARSER.md` §8.

The demo must be decompressed already, and never lives inside the repository.
