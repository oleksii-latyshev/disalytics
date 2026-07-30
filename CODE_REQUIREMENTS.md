# CODE_REQUIREMENTS.md

Code standards for the CS2 Demo Analyzer. `AGENTS.md` defines *what* to build and the
non-negotiable architecture; this file defines *how* the code is written.

The standard is: **code a senior engineer would sign off on without a follow-up conversation.**

---

## 1. Comments

Code explains itself. Comments explain what the code cannot.

**Do not write:**

```ts
// Loop through players
for (const player of players) { ... }

// Set the current frame
clock.frame = frame;
```

If a comment restates the code, delete the comment. If the code needs a comment to be readable,
fix the code — extract a named function, rename a variable, split the branch.

**Comments are required in exactly these cases:**

| Case | Why |
|---|---|
| Engine-derived constants | The number is unverifiable from the code alone |
| Binary layouts and bit-packing | The bit meaning exists nowhere else |
| The Go/JS bridge | Non-obvious blocking/async semantics |
| Workarounds for platform bugs | The next reader will otherwise "simplify" it back |
| Deliberate non-obvious performance choices | Otherwise it reads as a mistake and gets refactored |

```ts
// Source engine: default footstep audibility in a free field, from sv_footsteps behaviour.
// Verified against decompiled soundscape data — see docs/AUDIO.md.
const FOOTSTEP_RADIUS_UNITS = 1100;

// flags bitfield layout — must stay in sync with tools/wasm/export.go:writeFlags
const FLAG_ALIVE = 1 << 0;
const FLAG_DUCKING = 1 << 1;
const FLAG_SCOPED = 1 << 2;
```

**JSDoc** on exported members of `packages/*` only, and only where the signature is not
self-explanatory. Not on internal functions. Not on React components.

**TODO comments** must be `// TODO(#123): …` with a real issue. Untracked TODOs are rejected.

---

## 2. Naming

- `camelCase` values and functions, `PascalCase` types and components,
  `SCREAMING_SNAKE_CASE` module-level constants.
- **Units live in the name.** `radiusUnits`, `durationMs`, `speedUnitsPerSec`, `sizeBytes`.
  A bare `radius` or `duration` will be read wrong eventually.
- **`tick` and `frame` are different things and never interchangeable.** `tick` is a demo tick at
  the demo's own tick rate; `frame` is a sample index in `TickTrack` at `sampleHz`. A variable
  named `tick` holding a frame index is a bug even when the code works.
- Booleans read as assertions: `isAlive`, `hasDetonated`, `canSeeEnemy`. Never `flag`, `check`,
  `status`.
- No abbreviations except established domain ones (`hp`, `utility`, `nade`, `ct`, `t`).
  `plr`, `evt`, `cfg`, `res`, `data2` are rejected.
- Event handlers: `handleX` for the implementation, `onX` for the prop.
- Files: `kebab-case.ts`; React components `PascalCase.tsx`. One primary export per file.

---

## 3. Types

- `strict: true`. `noUncheckedIndexedAccess: true`. `exactOptionalPropertyTypes: true`.
- **No `any`.** Use `unknown` at boundaries and narrow explicitly.
- **No non-null assertions (`!`)** in application code. Narrow, or throw with a real message.
- Prefer `type` for unions and function types, `interface` for object shapes intended to be
  extended or implemented.
- Model impossible states out of existence. Prefer a discriminated union over optional fields:

```ts
// Rejected: four fields that must be checked in the right order and can contradict each other.
interface ParseState {
  isLoading: boolean;
  progress?: number;
  result?: ParsedDemo;
  error?: Error;
}

// Correct.
type ParseState =
  | { status: 'idle' }
  | { status: 'parsing'; phase: ParsePhase; percent: number }
  | { status: 'ready'; demo: ParsedDemo }
  | { status: 'failed'; error: ParseError };
```

- Use branded types for identifiers and indices that are easy to swap:

```ts
type Tick = number & { readonly __brand: 'Tick' };
type Frame = number & { readonly __brand: 'Frame' };
```

- Types describing parsed demo data live in `packages/demo-core/src/schema.ts`. Nowhere else.
- No type assertions (`as`) to silence an error. `as const` and narrowing after a real check are
  fine; `as SomeType` on an unverified value is not.

---

## 4. Functions and Modules

- A function does one thing. If you need "and" to describe it, split it.
- Guard clauses over nested conditionals. Maximum nesting depth of 3.
- Maximum ~4 parameters; beyond that pass a named options object.
- Pure functions by default in `packages/demo-core`. Side effects live at the edges.
- Files stay under ~300 lines. Beyond that there are two concerns hiding in one file.
- Export what is used. No barrel files re-exporting everything — they defeat tree-shaking and
  create import cycles.

---

## 5. Errors

- Never swallow an error. No empty `catch`. No `catch { console.log(e) }` as a resting state.
- Errors crossing a user-visible boundary are typed and carry a code:

```ts
type ParseErrorCode =
  | 'unsupported-pov-demo'
  | 'corrupt-file'
  | 'unsupported-game-version'
  | 'out-of-memory'
  | 'cancelled';

class ParseError extends Error {
  constructor(readonly code: ParseErrorCode, message: string, readonly cause?: unknown) {
    super(message);
  }
}
```

- The UI maps `code` to copy. It never string-matches on `message`, and never shows a raw exception.
- Throw for programmer errors, return a result for expected failures. A corrupt demo is expected;
  a mis-indexed typed array is not.

---

## 6. React

- Function components only. No class components. No `forwardRef` unless a ref is genuinely needed.
- Custom hooks for reusable stateful logic; they start with `use` and return a stable shape.
- **No `useEffect` for derived state.** Compute during render. Effects are for synchronising with
  something outside React (subscriptions, the worker, the rAF loop, the DOM).
- Every effect has a cleanup where one is possible. Every worker gets terminated. Every listener
  gets removed. Every rAF gets cancelled.
- No `useMemo` / `useCallback` by reflex. Add them when profiling shows a need, or when the value
  is a dependency of an effect that must not re-run.
- Props are typed inline or with a local `Props` type. No `React.FC`.
- Component files hold the component. Logic that could be tested without a DOM belongs in
  `demo-core` and is imported.
- No `<form>` elements where a plain button and handler will do.

---

## 7. Hot-Path Code

Applies to: the rAF loop, the renderer, scrub handlers, and any function touching `TickTrack`.

These rules override normal readability preferences, and this is one of the places where a
`// perf:` comment is required.

- **No allocation inside the loop.** No object literals, no array literals, no closures, no
  `.map`/`.filter`/`.reduce`, no spread. Reuse preallocated scratch objects.
- **No optional chaining or destructuring on hot per-frame data.** Index the typed array directly.
- No `async` in the render path. No `await`. Nothing that can suspend.
- Indexing is always `frame * slotCount + slot`, computed once into a local.

```ts
// perf: called 60×/s across 10 slots — no allocation, no closures, no method dispatch.
function readPositions(track: TickTrack, frame: number, out: Float32Array): void {
  const base = frame * track.slotCount;
  for (let slot = 0; slot < track.slotCount; slot++) {
    const i = base + slot;
    const o = slot * 3;
    out[o] = track.posX[i];
    out[o + 1] = track.posY[i];
    out[o + 2] = track.posZ[i];
  }
}
```

Anything outside the hot path is written for clarity first. Do not spread these constraints into
ordinary code — premature micro-optimisation elsewhere is its own defect.

---

## 8. Internationalisation

Policy is in `AGENTS.md` §11. These are the patterns.

### Two APIs, deliberately

`t()` is the primitive; `<Text>` is an ergonomic wrapper over it for JSX. Both are needed — a
component cannot produce an `aria-label`, a `document.title`, or a toast string.

```tsx
// JSX — the common case
<Text path="filters.blindDuration.label" as="label" />
<Text path="timeline.roundsRemaining" values={{ count: 7 }} />

// Everything else
const t = useT();
<button aria-label={t('playback.togglePlayback')} />
toast.error(t(errorKeyFor(error.code)));
document.title = t('common.documentTitle', { map });
```

`<Text>` takes `as` (default `span`), `path`, optional `values`, and nothing else. It is not a
styling component — do not add `className` conveniences to it, or it becomes the place styling
hides.

### Keys are typed

`path` is a generated union of valid key paths, not `string`. A typo fails at compile time.
Regenerate with `bun run i18n:check`. **If you find yourself casting to make a key type-check, the
key does not exist — add it to `en` first.**

Keys are semantic paths, never the English text:

```ts
'filters.blindDuration.label'      // correct
'Blind duration'                    // rejected — the source text is not an identifier
'filters.blindDurationLabelText'    // rejected — flat, and "Text" says nothing
```

### Sentences are whole

```tsx
// Rejected — grammatically impossible to translate into Russian
<Text path="stats.killedPrefix" /> {count} <Text path="stats.enemiesSuffix" />

// Correct — one key, ICU plural, four Russian forms live in the ru file
<Text path="stats.killedEnemies" values={{ count }} />
```

```json
// en
{ "killedEnemies": "Killed {count, plural, one {# enemy} other {# enemies}}" }
// ru
{ "killedEnemies": "Убито {count, plural, one {# врага} few {# врагов} many {# врагов} other {# врага}}" }
```

### Formatting is not translation

Use `Intl`, always with the active locale. Never format a number into a string by hand and never
put a formatted number inside a translation:

```ts
const damage = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
```

### Errors

`ErrorCode` (§5) maps to a key in the `errors` namespace. One mapping function, exhaustive over
the union, so adding a code without copy is a compile error:

```ts
function errorKeyFor(code: ParseErrorCode): ErrorKey {
  switch (code) {
    case 'unsupported-pov-demo': return 'errors.povDemo';
    case 'corrupt-file':         return 'errors.corruptFile';
    // no default — exhaustiveness is the point
  }
}
```

### Game vocabulary

Weapon names, map names, callouts and domain shorthand are **not** translation keys. They are
canonical constants in `demo-core`. Rendering `AK-47` or `Mirage` through `<Text>` is a mistake,
not thoroughness — see the table in `AGENTS.md` §11.

---

## 9. Rust Crates

- `crates/demo-parser` is plain Rust: **no `wasm-bindgen`, no `js-sys`, no `web-sys`.** It compiles
  and tests on the host with `cargo test`. Platform wrappers are thin and hold every binding.
- `#![forbid(unsafe_code)]` in the core crate unless a documented, benchmarked reason exists.
- Errors are typed with `thiserror` and map onto the same `ErrorCode` union the TS side consumes.
  A parser error crossing the boundary as a formatted string is a bug — the UI has to translate it.
- `clippy -D warnings` in CI, `rustfmt` on commit, same as Biome on the TS side.
- Buffers crossing to JS are written once and handed over. No serialisation to JSON, no per-tick
  values crossing the boundary individually.
- Public functions in the core crate carry doc comments; internals follow the same rule as §1.

---

## 10. Async and Workers

- `async`/`await` only. No raw `.then()` chains. No promise constructors except when wrapping a
  genuinely callback-based API.
- Every awaited operation that can hang takes an `AbortSignal`. Parsing must be cancellable end to
  end.
- Worker message types are defined once in `packages/demo-parser` and shared by both sides. No
  inline object literals as messages, no stringly-typed `type` fields outside that union.
- Transfer `ArrayBuffer`s; never structured-clone large payloads.
- No `postMessage` inside a loop. Batch.

---

## 11. Imports

- Workspace packages by name: `import { schema } from '@cs2/demo-core'`. Never a deep relative path
  across a package boundary.
- No circular imports. Biome enforces where it can; the rest is on review.
- Type-only imports use `import type`.
- Import order is handled by Biome. Do not hand-sort.

---

## 12. Tests

- Test behaviour, not implementation. A test that breaks on a rename without a behaviour change is
  a bad test.
- Test names state the expectation: `returns the last frame when the tick exceeds match length`,
  not `test frame lookup`.
- Every bug fix gets a regression test reproducing the bug first.
- `packages/demo-core` carries the bulk of coverage — it is pure and fast to test.
- Coordinate transforms, tick↔frame conversion, and filter predicates get exhaustive edge cases:
  frame 0, last frame, out of range, empty match, single round.
- No snapshot tests of React output. Golden snapshots of *parsed demo data* are the exception and
  are reviewed by hand when they change.
- No mocking of things you own. If mocking is needed to test a unit, the seam is in the wrong place.

---

## 13. Git

- Conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, `docs:`, `test:`.
  Scope where useful: `feat(parser): stream demo through io.Reader bridge`.
- One logical change per commit. Formatting-only changes go in their own commit.
- PR description states what changed, why, and how it was verified. If a performance budget was
  touched, include before/after numbers.

---

## 14. Review Checklist

Before opening a PR:

- [ ] Would a senior reviewer need to ask what any line does?
- [ ] Any comment that only restates the code — removed?
- [ ] Any required comment (§1) that is missing — added?
- [ ] Any `any`, `!`, or unexplained `as` — removed?
- [ ] Any impossible state representable by the types — eliminated?
- [ ] Any allocation added to a hot path (§7)?
- [ ] Any `await` added to a scrub or render path?
- [ ] Every effect, worker, listener, and rAF cleaned up?
- [ ] Every user-facing error mapped to real copy, not a raw exception?
- [ ] Every user-facing string going through i18n, with both `en` and `ru` filled in?
- [ ] Any sentence built by concatenating translated fragments — rewritten as one key?
- [ ] Russian plurals covering all four ICU forms where a count appears?
- [ ] Budgets in `AGENTS.md` §14 still met?

---

## 15. Rejected Patterns

Concrete things that will be sent back:

- `useEffect` that copies props into state
- `data`, `info`, `item`, `obj`, `temp`, `handleClick2` as names
- A `utils.ts` that becomes a dumping ground — name modules for what they do
- `console.log` left in committed code (a deliberate `console.warn` at a real boundary is fine)
- Commented-out code — git remembers it
- Defensive `if (!x) return` guards for cases the types already exclude
- A `try/catch` wrapping a whole function body to make an error "go away"
- Re-implementing something already in `demo-core` because importing felt inconvenient
- Adding a dependency for something the platform already does (`DecompressionStream`,
  `structuredClone`, `Intl.NumberFormat`, `AbortController`)
- A hardcoded user-facing string, however small — including `"—"` placeholders with meaning
- Using the English text as a translation key
- Running weapon names, map names or callouts through `<Text>`
- A key added to `en` without its `ru` counterpart, or vice versa
- `wasm-bindgen` anywhere inside `crates/demo-parser`
- A Rust error crossing into JS as a formatted human-readable string instead of a code
