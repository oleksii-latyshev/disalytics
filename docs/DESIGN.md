# DESIGN.md

Visual system for disalytics. Once approved, every colour, type and motion decision derives from it.

Engineering constraints that outrank aesthetics are in `AGENTS.md` §16, and the one that shapes this
document most is `AGENTS.md` §2 rule 9 — nothing animates on the main thread while playback runs.

**This revision replaces the "precision instrument" framing of the first version** (#103). That
version was implemented faithfully — `packages/ui/src/styles/tokens.css` repeated it hex for hex —
and the result read as a wireframe of its own data rather than as a product. What follows keeps the
one idea from it that was right, and changes everything built on top.

---

## 1. Direction

**The map is the stage. Everything else is glass laid over it.**

The reader is doing forensic work on a recording, repeatedly, for long sessions — that has not
changed. What changed is the conclusion drawn from it. Austerity is not the same as quality: an
interface can be quiet, dense and still feel like something built by someone who cared. The
difference is carried by surface, spacing and timing, not by adding colour.

Two products were studied and neither is to be copied. [cs2d.app](https://cs2d.app) is the closer
reference: measured live, its background is `rgb(10,12,18)` and its ink `rgb(222,226,234)` — within
a hair of the palette below, arrived at independently. Its quality does not come from the palette.
It comes from **translucent panels layered over a coloured map, radii around 4 / 8.5 / 12.75, and no
shadows anywhere**. Its typography is Inter with Sora and JetBrains Mono, which is the default
pairing of the moment; that part is not worth taking. Scope.gg is the reference for what the map
itself should carry: where each player is looking, and how far they can be heard.

### The three governing principles

> **1. Colour is data.** The only saturated pixels on screen belong to players, sides, damage and
> utility. Chrome is monochrome. A colour that carries no meaning is a bug.

> **2. Depth is alpha.** Elevation comes from translucency and a hairline, never from a drop shadow
> and never from a gradient. A panel over the map lets the map through, because the map is what the
> reader came for.

> **3. Motion is arrival and departure.** Things animate as they enter and leave, and at no other
> time. During playback the interface is completely still — that is a hard engineering rule, and it
> is also the reason the motion that does exist reads as deliberate.

Interaction — selection, focus, hover, the playhead — is expressed through luminance, never hue, so
it never collides with a data colour.

---

## 2. Colour Tokens

Token names below are the short form. In Tailwind v4 they are `--color-*`; the mapping lives once in
`packages/ui/src/styles/tokens.css` and nowhere else.

### Surface and ink — blue-shifted graphite, never pure black

Pure black plus neon is the genre cliché and creates halation against bright radar imagery. A
slightly blue graphite reads as a screen rather than a void and sits better under the map.

```css
--surface-0: #0E1216;   /* the stage: app background, behind the map */
--surface-1: #161B21;   /* opaque panels — rails, the spine strip */
--surface-2: #1F262E;   /* raised: hover, menus, the inside of an open drawer */
--line:      #2B333C;   /* hairlines, panel edges */
--line-soft: #202830;   /* internal dividers */
--ink:       #E4E9EE;   /* primary text */
--ink-dim:   #8A96A3;   /* secondary text, labels, the density trace */
--ink-faint: #5A646F;   /* disabled, axis labels, audibility rings */
```

### Glass — the panels that float over the stage

```css
--glass-panel:  rgb(22 27 33 / 0.72);   /* transport, drawer, floating controls */
--glass-raised: rgb(31 38 46 / 0.86);   /* menus and popovers over glass */
--glass-edge:   rgb(255 255 255 / 0.06); /* the 1px top edge that reads as a lit rim */
```

**No `backdrop-filter`.** It is tempting here and it is the wrong choice: the stage underneath is a
canvas repainting at display rate during playback, and a backdrop blur forces the compositor to
re-blur every one of those frames. Translucency alone gives the layering; the blur would cost the
frame budget in `AGENTS.md` §16 and buy an effect nobody asked for.

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

A semantic colour may only be used for the thing it names. An aggregate is not a semantic: "how much
happened in this minute" is not damage, so it is drawn in `--ink-dim`, not in `--damage`. This rule
is what resolves the contradiction the first version of this document shipped with; see §6.

Every semantic colour needs a colour-blind-safe variant, selectable in settings — this absorbs #81.
CT blue against T gold is the critical pair, and after this revision side identity has **three**
carriers, not one: hue, the side of the screen the player's rail is on, and the shape of the token
on the map. Hue alone is never sufficient.

### Interaction — luminance, not hue

```css
--focus:     #FFFFFF;                      /* focus ring, 2px, always visible */
--selected:  rgb(255 255 255 / 0.10);
--hover:     rgb(255 255 255 / 0.05);
--playhead:  #FFFFFF;                      /* the one pure-white element in motion */
```

**The playhead is the brightest thing on screen, and nothing else is allowed to be.** This clause
outranks any wish for a louder chart. It is the only element that says *where you are*, and an
interface where the reader has to hunt for it has failed at its one job.

---

## 3. Typography

Deliberately not Inter + JetBrains Mono — including in the face of the reference using exactly that.
It is the pairing of the moment and reads as such, and moving to it would make the product look like
every other tool released this year.

| Role | Face | Use |
|---|---|---|
| UI / display | **Wix Madefor Display** (600, 500) | headings, buttons, section labels |
| Dense labels | **Roboto Condensed** (500) | table headers, timeline labels, compact chips |
| Data / numerals | **IBM Plex Mono** (400, 500) | every number, tick, coordinate, timestamp |

All three are free, self-hosted and offline-capable, and all three were chosen after their Cyrillic
coverage was checked **in the font file**. The first draft of this document chose Archivo and Archivo
Narrow; inspection of the variable font found 653 codepoints and zero in `U+0400-04FF`, which would
have left the entire Russian interface in a system fallback. IBM Plex Sans Condensed was considered
for the dense-label role and rejected for shipping `cyrillic-ext` without the basic `U+0400-045F`
block. **A typeface is not a candidate for this product until its Cyrillic coverage has been verified
in the file**, never in its marketing copy.

### Rules

- **Every number uses IBM Plex Mono with `font-variant-numeric: tabular-nums`.** No exceptions.
  Digits that change width while a timeline runs are the loudest amateur signal in a data UI.
- Type scale (px): `11 · 12 · 13 · 14 · 16 · 20 · 28`. One addition in this revision: **`40` exists
  and is used exactly once per screen** — the round number over the stage, the way a broadcast
  captions a round. A single large number is the cheapest way an interface reads as designed rather
  than as assembled; two of them and the effect is gone.
- Line height 1.3 in dense rows, 1.5 in prose.
- Labels are Roboto Condensed 11px, uppercase, `letter-spacing: 0.06em`, `--ink-dim`.
- Sentence case everywhere else. No title case, no all-caps body text.

---

## 4. Surfaces, Depth and Radius

This section is new, and it is where the difference between the old direction and this one actually
lives.

```css
--radius-chip:  4px;    /* chips, cells, kill markers, anything sized in single digits */
--radius-card:  8px;    /* player rows, cards, popovers, inputs, buttons */
--radius-float: 12px;   /* anything floating over the stage: transport, drawer, dialog */
/* full pill: segmented controls and toggles only */
```

Three steps, and a component picks by **what it sits on**, not by taste: on the stage → 12, in a
panel → 8, inside a row → 4.

- **Elevation is a 1px `--line` edge plus a 1px `--glass-edge` inner top highlight.** Shadows are
  reserved for genuine overlays that must escape the layout — dialog and menu — and even there they
  are soft and large, never a drop shadow with a visible offset.
- **A floating element is translucent; a structural one is opaque.** The rails and the spine strip
  are structure and use `--surface-1`. The transport, the drawer and the round chip float and use
  `--glass-panel`.
- 4px spacing grid. Every gap, pad and size is a multiple of 4.
- Control height is **28px** for dense controls and **36px** for the primary transport control, and
  those are the only two heights in the product. The current build has 24px and 32px controls
  because the override only catches shadcn's `.h-9`; the fix is a real size variant in `@disa/ui`,
  not another override.
- Hairlines stay 1px at every device pixel ratio. A hairline that thickens on a retina display is a
  border pretending to be a hairline.

---

## 5. Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ROUND 14   de_nuke                       CT 8 : 5 T          ⋯     │  56px
├───────────┬─────────────────────────────────────────┬───────────────┤
│           │                                         │               │
│  CT RAIL  │                                         │    T RAIL     │
│           │              THE STAGE                  │               │
│  five     │        the radar, dominant              │    five       │
│  players  │                                         │    players    │
│           │      ┌───────────────────────────┐      │               │
│           │      │  transport (floating)     │      │               │
│           │      └───────────────────────────┘      │               │
├───────────┴─────────────────────────────────────────┴───────────────┤
│  THE MATCH SPINE                                                    │  96px
└─────────────────────────────────────────────────────────────────────┘
```

- **Two rails, one per side.** CT left, T right, five player rows each. Side identity becomes
  spatial: which half of the screen a player is on says which side they are on before any colour is
  read. Rail width is `minmax(min-content, 14rem)` — floored on its own content so a Russian label
  widens it instead of being clipped, capped so the stage stays dominant.
- **The stage takes everything else**, and the radar sizes to `min(100cqi, 100cqb)` inside it. The
  arithmetic is the point: at 1280×800 the radar today is **479px** square inside a 928px cell. Under
  this layout the stage is 832×656 and the radar is **656px** — the same rule, 37% more map, because
  the cell finally has the shape the rule assumes.
- **The transport floats over the bottom of the stage**, `--glass-panel`, `--radius-float`, centred,
  36px tall in a 56px block. It does not get its own row. The current build spends **205px** on a
  bottom slab holding the spine canvas, a marker row and the transport; this returns that to 96px
  and gives the difference to the map.
- **The inspector is a drawer, not a column.** It opens over the right rail from the stage edge, at
  `min(28rem, 40%)`, and closes to nothing. An empty column is dead weight on every screen where the
  reader has not selected anybody; a drawer costs nothing until it is asked for.
- The top bar is 56px and carries three things only: the round, the map, the score. The score is the
  one place a `--ct`/`--t` pair appears in the chrome, because a score *is* side data.
- The radar is never cropped or letterboxed. It keeps its aspect ratio and the layout adapts.

**Below 1100px wide the rails collapse** into a single strip above the spine. The tool targets a
laptop and up; the phone is the landing page's problem, not this screen's.

---

## 6. The Match Spine

The spine shows the entire match in one 96px strip, and it is the feature that delivers the product
promise. It is the signature element — but signature does not mean loudest.

The first version of this document said both "the playhead is the brightest thing and nothing else
is allowed to be" and "the spine is the one place to spend boldness", and the build honoured both:
the density trace is `--damage` at α0.55 across the full width, and it is now the most saturated
region of the interface, louder than the map it exists to serve. **The playhead wins.** The spine is
quiet by default and loud only where the reader has asked a question.

- **Round bands** — one band per round, tinted `--ct` or `--t` by winner, α0.10.
- **Round boundaries** — hairlines in `--line`, drawn on the canvas so they sit above the bands.
- **Event density** — a seismograph trace of kills and damage per second, in **`--ink-dim`, α0.35**.
  It is an aggregate, not damage, and §2 forbids spending a semantic colour on it. Monochrome also
  makes it read as terrain, which is what it is: the shape of where the match got loud.
- **Economy** — the equipment gap below the axis, side-tinted at α0.32. This one *is* side data, so
  it keeps its hue.
- **Kills** — 2px marks in `--kill`. The only saturated pixels in the strip, and the only ones that
  point at a single moment rather than a span.
- **Filter results** — when a filter is active, matching spans rise to `--ink` and everything else
  drops to `--ink-faint`. This is the "loud" the spine was promised, and it only ever happens in
  answer to a question.
- **Playhead** — 1px, pure white, the brightest element on screen.

---

## 7. The Radar

The stage carries more than dots. `TickTrack` already holds `yaw`, `pitch`, `speed` and `flags` —
this section costs the parser nothing and `SCHEMA_VERSION` nothing.

- **Player token** — a shape, not only a colour: CT and T carry different silhouettes so side
  survives a colour-blind reader and a screenshot. The token is `--ct`/`--t`; a dead player drops to
  `--ink-faint` and loses its cone.
- **View cone** — a wedge from the token in the player's side colour at α0.15, fading to transparent
  by ~1000 units. It answers "was he even looking that way", which is the question a review is
  usually about. Not drawn for a dead player, and not drawn while the reader is scrubbing faster
  than 4× — at that speed it is strobing, not information.
- **Audibility ring** — a 1px ring in `--ink-faint` α0.40 at the radius the player is currently
  audible from, derived from `speed`. Drawn **only for players who are actually making noise**, plus
  always for the selected player. Ten permanent rings is noise about noise.
- **Levels** — a map with two levels draws one at a time, chosen from the 10 Hz readout rather than
  from the clock, or the view flickers between floors as a player crosses the split.
- **Utility** — smokes, molotovs and flashes are areas in their own tokens at low alpha, with the
  same rule as everything else: they appear when they exist in the match and never as decoration.

The debug overlay ("show coordinates") is a development affordance and does not belong on the stage
in the shipped layout. It moves behind the same settings surface as the radar theme.

---

## 8. Motion

Motion is constrained by `AGENTS.md` §2 rule 9: **nothing animates on the main thread while playback
runs.** That is not a limitation to work around. It is the reason motion here means something — the
interface is still while you watch, and it moves when you act.

```css
--motion-micro: 120ms;   /* hover, focus, toggle */
--motion-base:  200ms;   /* panel content, tooltip, chip */
--motion-panel: 320ms;   /* drawer, dialog, view change */
--ease-out: cubic-bezier(0.2, 0, 0, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
```

### Where motion may run

- Chrome entering and leaving: drawer, dialog, menu, tooltip, toast.
- A view or tab changing.
- A value that updates at **10 Hz or slower** — the readouts, the score, the round number.
- Hover, focus and selection states.
- The one orchestrated moment, below.

### Where it may not

- Anything subscribed to the frame channel. Nothing on that channel may touch React, and nothing on
  it may start an animation either.
- Inside the radar or the spine canvas. Both are drawn imperatively; a tween there is a repaint per
  frame with a library on top of it.
- **Anywhere at all while `clock.isPlaying` is true.** This is enforced, not trusted: the transport
  writes `data-playing` on the document element, and a single global rule disables transitions and
  animations beneath it. A rule nobody can forget to follow is worth more than a paragraph asking
  people to remember.
- `width`, `height`, `top`, `left`, `filter` — never, in any transition. `transform` and `opacity`
  only.

`prefers-reduced-motion: reduce` collapses every duration except opacity fades, implemented once
globally in `packages/ui/src/styles/motion.css`.

### The one orchestrated moment

When a parse completes, the interface assembles rather than appearing: the spine draws left to right
as the data lands (~600ms), the round bands fade in behind it, the stage fades up, and the players
take their opening positions. It runs exactly once per demo, while nothing is playing, so it costs
nothing in the hot path — and it turns the end of a long wait into a payoff. This is currently
described and **not built**; it is the one place the document is allowed to lead the code, and it
needs an issue.

No other orchestrated sequence exists. Everywhere else, motion is a 120ms state change.

---

## 9. Components

[Animate UI](https://animate-ui.com) is the component layer. It follows the shadcn model — source is
copied into the repository, there is no component package at runtime — and it is built on `motion`,
which **is** a runtime dependency and is approved under `AGENTS.md` §2 rule 10 at roughly 30–35 kB
gzipped against the 500 kB budget.

- **Components live in `packages/ui`,** re-exported from `@disa/ui`. The shadcn copies currently in
  `apps/web/src/shared/components/ui` move there. This is not tidying: §4 says "override the
  primitives once", and today there is nowhere for that to happen, which is why three control
  heights coexist.
- Import `motion/react`, and prefer `LazyMotion` with the `m` component wherever a surface only needs
  the basic feature set. The bundle is a product constraint, and the full import is the expensive one.
- An Animate UI component that animates something §8 forbids is edited, not adopted as shipped. The
  library is a starting point for a component, never an argument for breaking a rule.
- Icons come from the animated Lucide set, per icon, never as a barrel import.

---

## 10. Copy

- Name things by what the reader controls, never by how the system works. "Reading the demo", not
  "Initializing WASM module".
- Buttons say what happens: "Open demo", "Cancel parse", "Clear filters". Never "Submit", "OK".
- An action keeps its name through the whole flow. The button that says "Open demo" leads to a screen
  headed "Opening demo".
- Errors state what happened and what to do, in the interface's voice, without apologising:
  > **This is a POV demo.** Only match demos (GOTV) contain data for all ten players.
  > Download the match demo from your match history and try again.
- Empty states are invitations: "Drop a `.dem` file here, or open one from your match history
  folder" — with the actual folder path for the reader's OS.

---

## 11. Bilingual Layout

The interface ships in English and Russian. Design for both from the first component, never as a
retrofit.

- **Russian runs 15–30% longer than English.** Every layout is designed against the Russian string.
  If a label only fits in `en`, the layout is wrong. This applies to the rails first: they are
  floored on `min-content` for exactly this reason.
- No fixed-width labels, no `w-24` on anything containing text. Buttons and chips size to content
  with a minimum, never a maximum.
- Truncation is a last resort and always carries the full text in a tooltip. Never truncate a button
  label — shorten the copy in both locales instead.
- All three faces are self-hosted with `latin`, `latin-ext`, `cyrillic` and `cyrillic-ext` subsets,
  and their Cyrillic rendering is verified in the browser rather than assumed.
- Numbers stay in IBM Plex Mono in both locales. Only the separators change, via `Intl`.
- Game vocabulary stays in Latin script in the Russian UI (`AK-47`, `Mirage`, `Mid`). Mixed-script
  lines are normal here and correct — that is how the audience speaks. Do not add visual treatment to
  "fix" it.
- The locale switch is in settings, not the top bar. It is set once and never touched again.

---

## 12. Density and Accessibility Floor

Non-negotiable, and never announced in the UI:

- Fully keyboard operable: the timeline scrubs with arrow keys, `,` / `.` step one tick, space
  toggles playback, `[` / `]` jump between rounds.
- Visible focus ring on every interactive element — 2px `--focus`, never `outline: none`.
- Body text meets 4.5:1 contrast. `--ink-dim` on `--surface-1` must be verified, not assumed, and
  `--ink-dim` on `--glass-panel` over the map must be verified separately — translucency changes the
  answer.
- Side identity never relies on hue alone: rail side, token shape and hue, in that order of
  reliability.
- Every canvas carries a text equivalent. The spine's round outcomes and economy already do; view
  cones and audibility rings do not need one, because they restate a position the feed already
  reports in words.
- Responsive down to a laptop screen. The tool is not designed for phones; the landing page is.
