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

## The four lines that are not upstream's

Each is marked in place. Re-apply them if `shadcn add` overwrites the file; delete them once
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

3. **`primitives/base/toggle-group.tsx`** — the item is a plain `<button>` where upstream renders
   a `motion.button` with a `whileTap` scale. **A motion component never receives the composite
   item's ref**, and Base UI's toggle group is a composite: it walks its items by calling `.focus()`
   on the node it was handed, so with nothing in that list an arrow key moves the group's tab stop
   and leaves the focus where it was. Measured over CDP on the review screen, three forms of the
   same press: with upstream's element the tab stop went 4 → 5 and `document.activeElement` did not
   move, and `HTMLElement.prototype.focus` was never called at all; passing the ref explicitly
   through Base UI's render-*function* form measured identically; with a plain button the focus
   walks the group as it should. The group also calls `stopPropagation` on the keys it takes, so the
   failure is not a press that falls through to something else — it is a press that does nothing.
   The `whileTap` scale goes with it, which costs this product nothing: interaction here is
   luminance rather than movement, and no other control in the kit scales under a press.

4. **`primitives/effects/highlight.tsx`** — the decorative pill no longer spreads
   `dataAttributes`. That set is `data-active`, `data-value`, `data-disabled`, `data-highlight` and
   **`aria-selected`**, and it is there to identify the *item*: the pill is the fill drawn behind
   one. `aria-selected` is not an attribute a generic element may carry, so every screen with a
   highlight on it shipped one — the rail, the round strip and each of the settings sheet's seven
   choice rows. Nothing reads the `data-*` half off that element, here or upstream: the one
   `querySelector` for `[data-value][data-highlight="true"]` runs in `parent` mode, where the pill
   never had them. The two remaining spreads — the item container and the clone — are untouched,
   and a call site answers those the way `RoundPill` and `ChoiceButton` do, by taking its props by
   name.

## What is deliberately not re-exported

`src/index.ts` is the package's only entrance, and it leaves out the registry's styled `Dialog`,
`Switch` and `Button`.

The dialog's story changed in #277 and is worth stating, because the file below it is now load-
bearing. `Dialog` and `Sheet` were a native `<dialog>` opened with `showModal()` until then, on the
argument that the top layer, the focus trap and the `Esc` close request are the platform's and need
no re-implementation. They are built on `primitives/base/dialog.tsx` — Base UI's dialog — now, for
the one thing the platform will not do: **let a dialog leave.** `close()` is immediate, so an exit
animation off a native `<dialog>` means holding it open on a timer and racing the element's own
state. Everything the native version was kept for, Base UI also does. What stays unexported is the
*styled* dialog above the primitive, which brings its own header, footer and close button.

`Switch` is ours for a different reason: it is a plain checkbox, which is what gives it `Space`, the
label association and the checked state assistive technology reads for free. Its file is still here
and still updates from the CLI; a screen that wants it exports it then.

Two components are taken from the primitive layer rather than the styled one — `Progress` and the
effects and numbers — because what those give is behaviour and the styling is ours. `Progress` has a
second reason and it is a hard rule: the styled track renders an indicator that animates `width`,
and a bar in this product scales rather than resizes.
