# animate-ui, vendored

Everything in this directory — and `src/hooks/`, and `src/lib/get-strict-context.tsx` — arrives from
[animate-ui's registry](https://animate-ui.com) through the CLI and is **left as it arrives**:

```bash
bunx --bun shadcn@latest add @animate-ui/components-base-accordion
```

`components.json` points the `@animate-ui` registry at `https://animate-ui.com/r/{name}.json` and
writes imports against `package.json`'s `imports` map. `shadcn.css` bridges every variable these
components read — `--background`, `--card`, `--popover`, `--primary`, `--muted`, `--accent`,
`--border`, `--ring`, the four radii — onto this product's own tokens, so a component added tomorrow
takes the palette without being touched.

Three boundaries exist so that "left as it arrives" is true rather than aspirational:

| Boundary | Where | What it does |
|---|---|---|
| Compiler | `tsconfig.json` | Six settings off for this package only. `apps/web`, `demo-core`, the parser packages and the store keep the repository's full strictness. |
| Linter | `biome.json` | Formatter, linter and assist off for this directory, `src/hooks/` and `src/lib/get-strict-context.tsx`. Reformatting upstream would make every re-add a diff. |
| Declarations | `tsconfig.build.json`, `tools/declaration-specifiers.ts` | `bun run build` emits `dist/**/*.d.ts` and `package.json`'s `exports` points consumers at them. With `skipLibCheck` on repository-wide, no consumer ever typechecks these sources — which is what lets the compiler boundary above be one package wide instead of leaking into the app. |

## The two lines that are not upstream's

Both are marked in place. Re-apply them if `shadcn add` overwrites the file; delete them once
upstream catches up.

1. **`components/base/tooltip.tsx`** — `@base-ui-components/react` moved `delay` off `Tooltip.Root`
   and onto `Tooltip.Provider` before `1.0.0-rc.0`. Upstream still types the prop from the root, and
   the type is the only thing that read the wrong side: the value already flows to the provider.

2. **`primitives/base/progress.tsx`** — `ProgressIndicatorProps` was
   `React.ComponentProps<typeof MotionProgressIndicator>`, which drags the inferred type of
   `motion.create(...)` into the emitted declarations. That type names a Base UI internal with no
   `exports` entry, so there is no specifier `tsc` can write for it (TS2742) and **this package
   cannot publish its types at all** — which would take the declaration boundary with it. Naming the
   two halves directly says the same thing.

## What is deliberately not re-exported

`src/index.ts` is the package's only entrance, and it leaves out the registry's `Dialog`, `Switch`
and `Button`. Ours are a native `<dialog>` opened with `showModal()` and a plain checkbox — the top
layer, the focus trap, the `Esc` close request, `Space`, the label association and the checked state
are all the platform's that way, and none of it has to be re-implemented in order to be styled. The
files are still here and still update from the CLI; a screen that wants one exports it then.
