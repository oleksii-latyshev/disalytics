# DESIGN.md

Visual system for disalytics. This is a **starting direction to approve or reject**, not
a settled fact — but once approved, every colour and type decision derives from it.

Engineering constraints that outrank aesthetics are in `AGENTS.md` §16.

---

## 1. Direction

**The reference point is not a gaming site. It is telemetry review software** — F1 race engineering,
flight data replay, audio editing. The user is doing forensic work on a recording, repeatedly, for
long sessions. The interface should feel like a precision instrument: dense, quiet, confident, and
completely legible at a glance.

This is stated explicitly because the default for a CS2 product is near-black with a neon green or
orange accent and angular "esports" chrome. That look is a genre convention, not a design decision,
and it actively hurts a data tool: saturated chrome competes with the data for attention.

### The governing principle

> **Colour is data. Interaction is luminance.**

The interface chrome is near-monochrome. The only saturated pixels on screen belong to players,
teams, damage, and utility. Selection, focus, hover, and the playhead are expressed through
brightness, not hue — so they never collide with a data colour and never compete for meaning.

Everything else follows from this.

---

## 2. Colour Tokens

### Surface and ink — blue-shifted graphite, never pure black

Pure black plus neon is the genre cliché and creates halation against bright radar imagery. A
slightly blue graphite reads as an instrument screen and sits better under the radar images.

```css
--surface-0: #0E1216;   /* app background */
--surface-1: #161B21;   /* panels, cards */
--surface-2: #1F262E;   /* raised, hover, popovers */
--line:      #2B333C;   /* hairlines, borders */
--line-soft: #202830;   /* internal dividers */
--ink:       #E4E9EE;   /* primary text */
--ink-dim:   #8A96A3;   /* secondary text, labels */
--ink-faint: #5A646F;   /* disabled, axis labels */
```

### Data colours — semantic only, never decorative

```css
--ct:            #4A90D9;   /* Counter-Terrorist side */
--t:             #E0A33E;   /* Terrorist side */
--damage:        #E5484D;
--kill:          #F04B50;
--nade-he:       #F5A524;
--nade-flash:    #EDF2F7;
--nade-smoke:    #7C8794;
--nade-molotov:  #FF6B35;
--objective:     #C13B8F;   /* plant / defuse — deliberately outside team hues */
```

Every semantic colour needs a colour-blind-safe variant, selectable in settings. CT blue vs T gold
is the critical pair; do not rely on hue alone for side identity — shape and position carry it too.

### Interaction — luminance, not hue

```css
--focus:     #FFFFFF;                      /* focus ring, 2px, always visible */
--selected:  rgba(255, 255, 255, 0.10);    /* selected row/panel fill */
--hover:     rgba(255, 255, 255, 0.05);
--playhead:  #FFFFFF;                      /* the one pure-white element in motion */
```

The playhead is the brightest thing on screen. Nothing else is allowed to be.

---

## 3. Typography

Deliberately not Inter + JetBrains Mono — that pairing is the current default and reads as such.

| Role | Face | Use |
|---|---|---|
| UI / display | **Archivo** (600, 500) | headings, buttons, section labels |
| Dense labels | **Archivo Narrow** (500) | table headers, timeline labels, compact chips |
| Data / numerals | **IBM Plex Mono** (400, 500) | every number, tick, coordinate, timestamp |

Archivo is a grotesque with enough width variation to stay legible when compressed; IBM Plex Mono
is technical without the "code editor" association of the usual choices. Both are free and
self-hosted — no external font requests, since the app must work offline.

### Rules

- **Every number uses IBM Plex Mono with `font-variant-numeric: tabular-nums`.** No exceptions.
  Digits that shift width while a timeline runs are the loudest amateur signal in a data UI.
- Type scale (px): `11 · 12 · 13 · 14 · 16 · 20 · 28`. Nothing larger appears in the tool itself;
  large type belongs on the landing page, not the instrument.
- Line height 1.3 in dense tables, 1.5 in prose.
- Labels are `Archivo Narrow` 11px, uppercase, `letter-spacing: 0.06em`, `--ink-dim`.
- Sentence case for everything else. No title case, no all-caps body text.

---

## 4. Layout

```
┌──────────────────────────────────────────────────────────────┐
│  MATCH STRIP   team · score · map · round                    │  48px
├──────────────────────────────────────┬───────────────────────┤
│                                      │                       │
│                                      │   INSPECTOR           │
│            RADAR                     │   event feed,         │
│            (dominant, square)        │   filters,            │
│                                      │   selected player     │
│                                      │                       │
├──────────────────────────────────────┴───────────────────────┤
│  THE MATCH SPINE                                             │  96px
└──────────────────────────────────────────────────────────────┘
```

- 4px spacing grid. Every gap, pad and size is a multiple of 4.
- Border radius **4px**, everywhere. shadcn's default 0.5rem reads soft and generic; 4px reads as
  an instrument. Nothing is pill-shaped except toggles.
- Elevation comes from a 1px hairline plus a 1px `rgba(255,255,255,0.04)` inner top highlight —
  not from drop shadows. Shadows are reserved for genuine overlays (dialog, popover).
- Controls are compact: 28px default height, not shadcn's 40px. Override the primitives once in
  `packages/ui`, not per usage.
- The radar is never cropped or letterboxed. It keeps its aspect ratio and the layout adapts.

---

## 5. Signature Element — The Match Spine

The timeline is the one place to spend boldness, and it is also the feature that delivers the
product promise (40 minutes → 10 minutes). It is not a plain scrubber. It shows the entire match
at once, in one 96px strip:

- **Round bands** — a thin band per round, tinted `--ct` or `--t` by winner, at low opacity
- **Round boundaries** — hairlines in `--line`
- **Event density** — a seismograph-like trace above the axis: kill and damage events per second,
  so the eye lands on the loud parts of the match without reading anything
- **Economy** — a faint area chart below the axis showing the equipment-value gap between teams
- **Filter results** — when a filter is active, matching moments light up in `--ink` and everything
  else drops to `--ink-faint`
- **Playhead** — a 1px pure-white line, the brightest element on screen

The whole match is legible in one glance, and any moment is one click away. Everything else in the
interface stays quiet so this can be loud.

---

## 6. Motion

Motion is constrained by `AGENTS.md` §16: nothing animates on the main thread while playback runs.
That constraint is a design asset — it forces motion into state *transitions*, where it means
something, instead of ambient decoration.

```css
--motion-micro: 120ms;   /* hover, focus, toggle */
--motion-base:  200ms;   /* panel content, tooltip, chip */
--motion-panel: 320ms;   /* drawer, dialog, view change */
--ease-out: cubic-bezier(0.2, 0, 0, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
```

- Animate `transform` and `opacity` only. Never `width`, `height`, `top`, `left`, or `filter` in a
  transition.
- Enter with `--ease-out`, exit with `--ease-in`, exits ~30% faster than entrances.
- `prefers-reduced-motion: reduce` collapses every duration to 0ms except opacity fades. Implement
  once as a global rule, not per component.

### The one orchestrated moment

When a parse completes, the interface assembles rather than appearing: the spine draws left to
right as the data lands (~600ms), round bands fade in behind it, then the radar fades up and the
players take their opening positions. It runs exactly once per demo, while nothing is playing, so
it costs nothing in the hot path — and it turns the end of a 90-second wait into a payoff.

No other orchestrated sequence exists. Everywhere else, motion is a 120ms state change.

---

## 7. Copy

- Name things by what the user controls, never by how the system works. "Parsing demo", not
  "Initializing WASM module".
- Buttons say what happens: "Open demo", "Cancel parse", "Clear filters". Never "Submit", "OK".
- An action keeps its name through the whole flow. The button that says "Open demo" leads to a
  screen headed "Opening demo".
- Errors state what happened and what to do, in the interface's voice, without apologising:
  > **This is a POV demo.** Only match demos (GOTV) contain data for all ten players.
  > Download the match demo from your match history and try again.
- Empty states are invitations, not decoration: an empty library says "Drop a `.dem` file here, or
  open one from your match history folder" — with the actual folder path for the user's OS.

---

## 8. Bilingual Layout

The interface ships in English and Russian. Design for both from the first component, not as a
retrofit.

- **Russian runs 15–30% longer than English.** Every layout is designed against the Russian string,
  not the English one. If a label only fits in `en`, the layout is wrong.
- No fixed-width labels, no `w-24` on anything containing text. Buttons and chips size to content
  with a minimum, never a maximum.
- Truncation is a last resort and always carries a title/tooltip with the full text. Never truncate
  a button label — shorten the copy in both locales instead.
- Archivo Narrow handles dense Cyrillic well; verify the specific weights render correctly in
  Cyrillic before shipping — not every Latin-designed grotesque does.
- Numbers stay in IBM Plex Mono in both locales. Only the separators change, via `Intl`.
- Game vocabulary stays in Latin script in the Russian UI (`AK-47`, `Mirage`, `Mid`). Mixed-script
  lines are normal here and correct — that is how the audience speaks. Do not add visual treatment
  to "fix" it.
- The locale switch is in settings, not the top bar. It is set once and never touched again.

---

## 9. Density and Accessibility Floor

Non-negotiable, and never announced in the UI:

- Fully keyboard operable: the timeline scrubs with arrow keys, `,` / `.` step one tick,
  space toggles playback, `[` / `]` jump between rounds.
- Visible focus ring on every interactive element — 2px `--focus`, never `outline: none`.
- Body text meets 4.5:1 contrast; `--ink-dim` on `--surface-1` must be verified, not assumed.
- Side identity never relies on hue alone.
- Responsive down to a laptop screen at minimum. The tool is not designed for phones; the landing
  page is.
