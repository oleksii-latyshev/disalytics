# disalytics

A fully client-side web application for analyzing Counter-Strike 2 match replays (`.dem`),
installable as a PWA, in English and Russian.

The goal is to compress a 40-minute match into a ~10-minute review through smart filtering, an
interactive timeline, and spatial insight on a 2D radar.

**Your demo never leaves your machine.** The file is decompressed and parsed by a Rust parser
compiled to WebAssembly, running in a Web Worker in your browser. There is no upload, no account,
and no server that ever sees a `.dem`. After the first load the app works offline.

**Product principle:** this is a tool for *review*, not frame-perfect replay. Where accuracy and
interaction smoothness conflict, disalytics favours smoothness and labels the approximation in the
UI.

The name is deliberately game-agnostic. A future Counter-Strike release means a new demo format and
a new parser crate — the product around it survives that, so nothing outside `crates/demo-parser`
encodes "CS2" as an assumption.

---

## Status

**Live at [disalytics.disa-67b.workers.dev](https://disalytics.disa-67b.workers.dev)** — an
assets-only Cloudflare Worker, deployed from `main` behind a green pipeline and checked by
`bun run smoke` on every deploy. Drop in a `.dem`, `.dem.zst` or `.dem.bz2` and it parses in the
tab.

Phases 0–4 are behind it: the parser is validated and ships as WebAssembly, demos are decompressed
and parsed in a Web Worker and cached in OPFS, the radar and the playback clock are built. **The
work is in Phase 5 — the review screen**, whose redesign closed on 1 September 2026. What is still
open, in milestones with a priority and a size each, is [`ROADMAP.md`](ROADMAP.md).

No measurement is restated on this page. A number in two places is a number that will disagree with
itself, so the budgets and what the shipped build measures against them live in
[`AGENTS.md`](AGENTS.md) §16, and the parser's own numbers live in
[`docs/PARSER.md`](docs/PARSER.md).

---

## Stack

| Area | Choice |
|---|---|
| Package manager / script runner | Bun 1.3+ (text `bun.lock`) |
| Monorepo orchestration | Turborepo |
| Framework | React 19, SPA, client-render only |
| Language | TypeScript `strict`, Rust (parser) |
| Bundler | Vite |
| Lint + format | Biome |
| Styling | Tailwind CSS v4 over the token layer in `packages/ui/src/styles/tokens.css` |
| Components | shadcn/ui and animate-ui, **copied** into `packages/ui`, over Base UI primitives |
| Motion | `motion`, through one provider in `@disa/ui` |
| i18n | react-intl (FormatJS), typed keys, `en` + `ru` |
| UI state | React state, plus a plain mutable object + rAF for the playback clock. No store: the transport is the state, and `clock.frame` may not live in a reactive one |
| Radar rendering | Canvas 2D |
| Parser | Rust (`demoparser2`) compiled with wasm-pack, run in a Web Worker |
| Persistence | OPFS, IndexedDB fallback |
| Testing | Vitest |
| PWA | `vite-plugin-pwa`, `injectManifest` mode |
| Hosting | Cloudflare Workers with static assets |

---

## Repository layout

```
apps/
  web/                  # the SPA — the only app today
packages/
  demo-core/            # schema, clock and the rules both sides share — no DOM, no React, no I/O
  demo-parser/          # the parse worker, its protocol, and the client that terminates it
  demo-store/           # the parsed-demo cache — OPFS first, IndexedDB fallback
  map-data/             # Valve's overview constants, the world→radar transform, the radar images
  i18n/                 # locale resources, typed key union, <Text>, useT
  ui/                   # shared components, the token layer, the motion provider
  tsconfig/             # shared tsconfig bases
crates/
  demo-parser/          # the Rust parser — no wasm-bindgen, so a native build stays possible
  demo-parser-wasm/     # the thin wasm-bindgen wrapper; wasm-pack writes its gitignored pkg/ here
vendor/                 # LaihoE/demoparser, pinned and patched — read vendor/README.md first
tools/
  probes/               # the Phase 0 Rust probes behind docs/PARSER.md
  scripts/              # the checks and generators behind the bun run commands below
docs/                   # PARSER.md
```

Workspace packages are named `@disa/<folder>`, and the folder name always matches.

Dependency direction is one-way: `apps/*` → `packages/*`, and inside `apps/web/src`,
`features → core → shared`. Never sideways, never upward.

---

## Getting started

Requires [Bun](https://bun.com) 1.3+, and — for a first run from a fresh clone — the Rust toolchain
and `wasm-pack`. `crates/demo-parser-wasm/pkg` is generated and gitignored, and the SPA imports the
glue inside it, so nothing serves or builds until the parser has been built once. After that,
frontend work never touches Rust again.

```bash
bun install
bun run wasm:build     # writes crates/demo-parser-wasm/pkg — needed once per parser change
bun run dev
```

The Rust channel, components and `wasm32` target all come from `rust-toolchain.toml`, so
`rustup` picks them up on its own.

Lefthook installs its `pre-commit` and `pre-push` hooks during `bun install`; there is no separate
setup step.

### Commands

```bash
bun run dev               # vite dev server for apps/web
bun run build             # tsc --noEmit && vite build -> apps/web/dist
bun run preview           # build, then serve apps/web/dist through wrangler dev on :8787
bun run typecheck         # workspaces via turbo, then tools/scripts
bun run check             # biome — lint + format (check:fix to apply)
bun run test              # vitest, node environment
bun run i18n:check        # en/ru parity, every key read + regenerates the typed key union
bun run errors:check      # ErrorCode parity between demo-core and crates/demo-parser
bun run bitfields:check   # FLAG_* / GRENADE_* parity between the same two files
bun run tokens:check      # every class and var(--…) resolves in the built CSS (build first)
bun run size              # gzip bundle + wasm against the budgets in AGENTS.md §16 (build first)
bun run smoke <url>       # assert the AGENTS.md §13 deploy contract against a running URL
bun run wasm:build        # wasm-pack build crates/demo-parser-wasm -> pkg/
bun run wasm:smoke        # call into the built binary — proves it runs, not that it compiled
bun run mapdata:generate  # map constants + themed radar images; byte-stable across runs
bun run icons:generate    # weapon, utility and equipment outlines; byte-stable across runs
bun run repo:labels       # sync the GitHub label taxonomy (idempotent)
bun run repo:milestones

cargo test -p demo-parser   # parser core, no WASM toolchain involved
```

Still to arrive: `e2e`. The full intended set is in [`AGENTS.md`](AGENTS.md) §5.

---

## Documentation

| Document | Read it before |
|---|---|
| [`AGENTS.md`](AGENTS.md) | any non-trivial task — it is the operating contract |
| [`CODE_REQUIREMENTS.md`](CODE_REQUIREMENTS.md) | writing any code |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | creating an issue, branch, or PR |
| [`ROADMAP.md`](ROADMAP.md) | asking what is next, and what it is allowed to cost |
| [`packages/ui/src/styles/tokens.css`](packages/ui/src/styles/tokens.css) | any visual or component work — the token layer replaced `docs/DESIGN.md` on 1 September 2026 |
| [`docs/PARSER.md`](docs/PARSER.md) | parser or WASM work |
| [`CLAUDE.md`](CLAUDE.md) | the condensed entry point for AI agents |

`AGENTS.md` §2 lists the hard rules — no server ever touches a `.dem`, parsing stays in a worker,
per-tick data stays columnar, the playback clock stays out of reactive state, no hardcoded
user-facing strings. Violating one of them is a bug, not a trade-off.

---

## Contributing

The loop is `issue → branch (gh issue develop) → commits → PR (Closes #N) → CI green → squash
merge`. No issue, no branch; one PR per issue; conventional commit titles. Details, labels and the
exact `gh` commands are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Credits

disalytics is a thin layer over other people's work. Two of these are **copied into this
repository** rather than installed, which is the distinction that carries obligations — the copies
are the ones to check before changing anything.

| Project | License | What disalytics takes |
|---|---|---|
| [`LaihoE/demoparser`](https://github.com/LaihoE/demoparser) | MIT | The demo parser itself. **Copied** into [`vendor/`](vendor/README.md) at a pinned revision and patched, because `Instant::now()` traps on `wasm32` and both build scripts reach the network. Every deviation from upstream is listed in `vendor/README.md` and nowhere else. |
| [`MurkyYT/cs2-map-icons`](https://github.com/MurkyYT/cs2-map-icons) | none declared | Radar images and Valve's overview coordinate data (`pos_x`, `pos_y`, `scale`), extracted from the game depot on a schedule. The map data is generated from them; the assets themselves remain Valve's. |
| [`Juknum/counter-strike-icons`](https://github.com/Juknum/counter-strike-icons) | tooling MIT, assets Valve's | The weapon and utility outlines under [`apps/web/assets/weapon-icons`](apps/web/assets/weapon-icons/README.md) and the armour marks under [`apps/web/assets/equipment-icons`](apps/web/assets/equipment-icons/README.md), extracted from the game depot on a schedule. `bun run icons:generate` simplifies them into the tables the app ships; the outlines themselves remain Valve's. |
| [`shadcn/ui`](https://github.com/shadcn-ui/ui) | MIT | The component source under `packages/ui/src/components`. **Copied** by the CLI, per `packages/ui/components.json` — these are files in this repository, not a dependency, and they are edited here rather than tracked upstream. |

Counter-Strike 2, the `.dem` format, and the overview, radar and weapon art this repository derives
from are the property of **Valve Corporation**. disalytics is an unofficial tool, not affiliated with or
endorsed by Valve.

Everything else arrives through a package manager and is recorded in `bun.lock` and `Cargo.lock`
rather than here.
