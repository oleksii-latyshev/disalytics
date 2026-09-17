---
name: i18n-key
description: Add or change a user-facing disalytics string in English and Russian.
---

# User-facing copy

Use `AGENTS.md` §11 and read only `CODE_REQUIREMENTS.md` §10 when implementation detail is needed.

- Add the semantic key to English and Russian in the same change. Keep one whole sentence per key;
  Russian ICU plurals include `one`, `few`, `many` and `other`.
- Do not translate game vocabulary: weapons, maps, callouts, sites and domain shorthand remain
  canonical `demo-core` values.
- Use `<Text>` in JSX and `useT()` where a string is required. Format numbers and dates with `Intl`.
  Parsers and `demo-core` emit codes or `{ key, params }`, never prose.
- Run `bun run i18n:check` after editing locales; it validates parity and usage and regenerates the
  committed typed key union. CI owns the full typecheck and build.
- Check changed layouts with the longer Russian copy when presentation is affected.
