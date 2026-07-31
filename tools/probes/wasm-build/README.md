# wasm-build probe

Throwaway Phase 0 code. It answers whether the parser confirmed in `docs/PARSER.md` §1–§7 can be
compiled to `wasm32-unknown-unknown` and run in a browser under our constraints, and what the
binary weighs. Findings are in `docs/PARSER.md` §8. Nothing in the build depends on this.

## Setup

The probe needs a checkout of upstream with one patch applied. The pinned revision **traps on
wasm32 before it reaches any parsing** — see `docs/PARSER.md` §8 — so an unpatched build produces an
artifact that cannot run and, worse, measures small because the optimiser removes the parser as
unreachable.

```bash
brew install protobuf                       # csgoproto's build script needs protoc

git clone https://github.com/LaihoE/demoparser
git -C demoparser checkout ba39cc44cd5abfd7f34df2b3c0a7dd3630048311
git -C demoparser apply --directory=src/parser/src \
    "$(git rev-parse --show-toplevel)/tools/probes/wasm-build/lazy-instant.patch"
```

Place the checkout so that `parser` resolves — the manifest expects `demoparser/` four levels above
this directory, matching the layout above when cloned next to the repository. Adjust the path in
`Cargo.toml` if you put it elsewhere.

## Build

```bash
RUSTFLAGS='--cfg getrandom_backend="wasm_js"' \
  wasm-pack build --release --target web --out-dir pkg
```

Add `--features diagnostic` for a build with `console_error_panic_hook` installed. It is worth
having: without it a Rust panic and a genuine trap are indistinguishable, and they need different
fixes.

## Run

```bash
cp -r pkg <serve-dir>/pkg
cp worker.js index.html server.py <serve-dir>/
ln -s /path/to/demo.dem <serve-dir>/fixture.dem
cd <serve-dir> && python3 server.py     # serves .wasm as application/wasm
```

Open `http://127.0.0.1:8765`. Parsing runs in a Web Worker — hard rule 2 applies to throwaway code
too.

The demo must be decompressed already, and never lives inside the repository.

## Reading the output

Each step is timed and reported independently, because **a trap poisons the whole instance**: once
one call traps, every later call throws too. Isolating steps is what tells a real failure apart from
the wreckage of an earlier one. The `Instant::now` check runs last for exactly this reason.
