# schema-extraction probe

Throwaway Phase 0 code. It answers one question — can `AGENTS.md` §10 be extracted from
`demoparser2` — and it is kept only so the answer in `docs/PARSER.md` can be re-checked when the
upstream parser moves. It is not part of the build, is not a workspace member, and nothing imports
it.

## Running it

Requires `protoc` on the host: the upstream `csgoproto` build script compiles Valve's protobuf
definitions.

```bash
brew install protobuf
```

Then point it at a decompressed demo:

```bash
cargo run --release --manifest-path tools/probes/schema-extraction/Cargo.toml -- /path/to/demo.dem
```

The demo must be decompressed already — the probe does not handle `.zst`. See `AGENTS.md` §7.1.

Never commit a `.dem` file, and never place one inside the repository.

## What it prints

Four passes over the same demo, each with a different `ParserInputs` combination, plus a report of
which parts of the event schema each pass yields. The pass structure is the finding — see
`docs/PARSER.md`.
