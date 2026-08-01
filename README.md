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

Pre-release. Nothing is deployed and there is no build to try yet.

- **Phase 0 — parser validation: complete.** The Rust default was tested against a 337 MB demo in
  the browser: 10.4 s parse, 663 MB of WASM linear memory, 2.18 MB shipped WASM, with grenade
  trajectories and per-player blind durations both extractable. Full findings in
  [`docs/PARSER.md`](docs/PARSER.md).
- **Phase 1 — foundation: in progress.** Bun + Turborepo + Vite + Biome, the `apps/web` skeleton,
  `packages/i18n` with both locales wired from day one, and the design tokens are in. CI workflows,
  size gates and the Cloudflare Workers deploy are not.

Phases 2–6 — parsing pipeline, radar, playback, analytics, PWA polish — are described in
[`AGENTS.md`](AGENTS.md) §19.

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
| Styling | Tailwind CSS + shadcn/ui |
| i18n | react-intl (FormatJS), typed keys, `en` + `ru` |
| UI state | Zustand for discrete state; a plain mutable object + rAF for the playback clock |
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
  i18n/                 # locale resources, typed key union, <Text>, useT
  ui/                   # shared shadcn primitives + design tokens
  tsconfig/             # shared tsconfig bases
tools/
  probes/               # Phase 0 Rust probes behind docs/PARSER.md
  scripts/              # i18n key check, label and milestone sync (run with bun)
docs/                   # DESIGN.md, PARSER.md
```

Workspace packages are named `@disa/<folder>`, and the folder name always matches.

Arriving in later phases, as specified in [`AGENTS.md`](AGENTS.md) §4: `packages/demo-core`,
`demo-parser`, `demo-store` and `map-data`, and the `crates/` tree holding the Rust parser and its
thin `wasm-bindgen` wrapper. Their absence today is a schedule fact, not a contradiction.

Dependency direction is one-way: `apps/*` → `packages/*`, and inside `apps/web/src`,
`features → core → shared`. Never sideways, never upward.

---

## Getting started

Requires [Bun](https://bun.com) 1.3+. Nothing else — the Rust and WASM toolchains are only needed
once the parser crates land in Phase 2.

```bash
bun install
```

```bash
bun run dev
```

Lefthook installs its `pre-commit` and `pre-push` hooks during `bun install`; there is no separate
setup step.

### Commands

```bash
bun run dev            # vite dev server for apps/web
bun run build          # tsc --noEmit && vite build -> apps/web/dist
bun run typecheck      # tsc --noEmit across the workspace
bun run check          # biome — lint + format (check:fix to apply)
bun run test           # vitest
bun run i18n:check     # en/ru parity + regenerates the typed key union
bun run repo:labels    # sync the GitHub label taxonomy (idempotent)
bun run repo:milestones
```

Planned, once the phases that need them land: `wasm:build`, `mapdata:generate`, `size`, `preview`,
`e2e`, and `cargo test -p demo-parser`. The full intended set is in [`AGENTS.md`](AGENTS.md) §5.

---

## Documentation

| Document | Read it before |
|---|---|
| [`AGENTS.md`](AGENTS.md) | any non-trivial task — it is the operating contract |
| [`CODE_REQUIREMENTS.md`](CODE_REQUIREMENTS.md) | writing any code |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | creating an issue, branch, or PR |
| [`docs/DESIGN.md`](docs/DESIGN.md) | any visual or component work |
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
