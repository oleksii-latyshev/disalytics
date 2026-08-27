---
name: i18n-key
description: Add or change a user-facing string in disalytics correctly — en and ru together, ICU plurals with all four Russian forms, typed keys, no translated game vocabulary. Use whenever writing any text a user will see: labels, buttons, tooltips, aria-labels, toasts, empty states, error copy.
---

# Adding a user-facing string

Policy is `AGENTS.md` §11, patterns are `CODE_REQUIREMENTS.md` §10. This is the operational version.

**No user-facing string is ever hardcoded.** However small, however obviously untranslatable it
looks.

## Step 0 — is it actually translatable?

Game vocabulary is **not** a translation key. Russian-speaking CS players use the English terms;
translating them makes the tool read as though written by someone who does not play.

| Never translated — canonical constants in `demo-core` | Translated — i18n keys |
|---|---|
| Weapon names (`AK-47`, `Deagle`, `AWP`) | UI chrome, labels, buttons, settings |
| Map names (`Mirage`, `Nuke`, `Ancient`) | Explanatory and help text |
| Callouts and sites (`A`, `B`, `Mid`, `Palace`) | Error messages |
| Domain shorthand (`eco`, `force`, `clutch`, `ace`, `wallbang`, `entry`) | Onboarding, empty states |

Rendering `AK-47` through `<Text>` is a mistake, not thoroughness. Mixed-script lines in the Russian
UI are normal and correct — that is how the audience speaks. Do not add visual treatment to "fix"
them.

## Step 1 — add the key to `en` first

Namespaces: `common`, `timeline`, `filters`, `radar`, `settings`, `errors`.

Keys are semantic paths, never the source text:

```
filters.blindDuration.label      correct
"Blind duration"                 rejected — source text is not an identifier
```

The key union is generated from the `en` resources. **If you are casting to make a key type-check,
the key does not exist** — add it to `en` instead of casting.

## Step 2 — add the `ru` counterpart in the same change

A key added to `en` without `ru` is a rejected pattern, not a follow-up task.

**Russian plurals need all four ICU forms.** A file with only singular and plural is broken for
`ru`.

```json
// en
{ "killedEnemies": "Killed {count, plural, one {# enemy} other {# enemies}}" }
// ru
{ "killedEnemies": "Убито {count, plural, one {# врага} few {# врагов} many {# врагов} other {# врага}}" }
```

## Step 3 — one key, one whole sentence

Never build a sentence by concatenating translated fragments. It is grammatically impossible in
Russian.

```tsx
// Rejected
<Text path="stats.killedPrefix" /> {count} <Text path="stats.enemiesSuffix" />

// Correct
<Text path="stats.killedEnemies" values={{ count }} />
```

## Step 4 — use the right API

`<Text>` for JSX, `t()` where a component cannot go — `aria-label`, `document.title`, toasts.

```tsx
<Text path="filters.blindDuration.label" as="label" />
<Text path="library.saved.rounds" values={{ count: 7 }} />

const t = useT();
<button aria-label={t('controls.togglePlayback')} />
toast.error(t(errorKeyFor(error.code)));
```

`<Text>` takes only `as` (default `span`), `path`, `values`. It is not a styling component.

## Step 5 — numbers are formatted, not translated

`Intl.NumberFormat` / `Intl.DateTimeFormat` with the active locale. Never hand-format, never put a
formatted number inside a translated string. `2.4s` vs `2,4 с` is formatting, not translation.

## Errors

`ErrorCode` maps to a key through one exhaustive switch with **no `default`**, so adding a code
without copy is a compile error:

```ts
function errorKeyFor(code: ParseErrorCode): ErrorKey {
  switch (code) {
    case 'unsupported-pov-demo': return 'errors.povDemo';
    case 'corrupt-file':         return 'errors.corruptFile';
    // no default — exhaustiveness is the point
  }
}
```

Error copy states what happened and what to do, in the interface's voice, without apologising.
`demo-core` and the parser never produce prose — they emit codes and `{ key, params }`.

## Step 6 — verify

```bash
bun run i18n:check    # key parity, every key read + regenerates the typed key union
bun run typecheck
```

Also check the layout against the **Russian** string, not the English one. Russian runs 15–30%
longer. If a label only fits in `en`, the layout is wrong — fix the layout, not the translation.
