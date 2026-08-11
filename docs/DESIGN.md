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

**There is no light theme, and this is a decision rather than a gap.** `@custom-variant dark (&)` in
`apps/web/src/styles.css` makes the dark appearance unconditional on purpose. A second palette would
double the token layer, re-open every contrast check, and need a third radar plate; the day one is
designed, that variant becomes a real selector again.

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

**`--ink-dim` may not carry text on glass over the plate — #119.** §12 asks for this case to be
measured separately, and measured it fails: composited over the eight `blue` plates, `--ink-dim` on
`--glass-panel` reads **2.82:1** at its worst and is still under 4.5:1 at the 1st percentile on five
of the eight. The worst ground is `rgb(255 202 61)`, the bombsite marking, which the `blue` generator
keeps saturated on purpose because it encodes space. `--glass-raised` is no better: **3.64:1**.

So text on a panel that floats over the plate is **`--ink`**, which reads **6.95:1** on that same
worst pixel. Secondary text there is secondary by size and weight, not by ink level. `--ink-faint` is
excluded by the same rule and was never eligible — it measures 2.88:1 even on opaque `--surface-1`,
which is why §12 already confines it to non-body use.

The alpha values above are unchanged, and that is the decision rather than an omission. Lifting
`--glass-panel` to 0.89 and `--glass-raised` to 0.95 is what it would take for `--ink-dim` to clear
the floor (4.52:1 and 4.55:1), and it would drop the plate showing through from 28% to 11% and from
14% to 5% — two tokens that would no longer read as glass, to keep one ink level. Away from the
plate nothing changes: `--ink-dim` on `--surface-1` measures **5.75:1** and on `--surface-0`
**6.24:1**.

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

### The map plate is neither chrome nor data

"Chrome is monochrome" does not reach the map itself. The plate carries colour that encodes *space* —
playable floor against void, one level against another, the bombsite outlines Valve draws — and that
colour is information about the map, so it is allowed. What it may not do is compete: **the plate
stays below every player token and every event mark in both saturation and value.** A reader must be
able to find ten tokens on it without searching.

This is a theme decision, not a per-component one. `packages/map-data` already ships Valve's
overviews as extracted, and they are coloured; the desaturated plate in the current build is the
generated `blue` theme, selected by `DEFAULT_RADAR_THEME`. **`blue` stays the default and `vanilla`
becomes selectable in settings** — the quiet plate is the better ground for ten tokens, and the
reader who wants the game's own colours can have them. Which plate is better is settled by looking at
tokens on top of both, never by looking at the plate alone.

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

### The accent — one hue, and a fence around it

```css
--accent: #65A1F8;   /* the product's own blue: identity and the primary action */
```

The accent is what makes a screen look like a product rather than a demo, and it is also the single
easiest way to break principle 1. It sits **within a few degrees of `--ct`** — `#65A1F8` against
`#4A90D9` — which is not an accident of taste but a genuine hazard: a blue control beside a blue
player token invites the reader to think the control means *Counter-Terrorist*.

So the accent is fenced, and the fence is the whole of the rule:

- **Never on the plate, never in the rails, never in the spine.** Those three surfaces are where side
  colour lives, and the accent may not appear where a side token can be seen at the same time.
- **Yes** on the library and parse screens, the top bar's actions, dialogs, menus, and the drawer's
  own controls — the surfaces that carry no side data at all. The parse progress bar is the accent's
  best use in the product: it is the first thing a new reader watches, and it carries no data.
- **It is a fill, never a text colour on `--surface-0`.** At 4.5:1 it passes on graphite, but accent
  text next to ink text reads as a link where none exists.
- It replaces no interaction state. Focus stays white, selection stays white at 10%, hover stays
  white at 5%. The accent says *this is the thing to press*, not *this is where you are*.

If a screen ever shows an accent control and a CT token close enough to compare, the accent loses and
the control goes monochrome. That test is worth running with a screenshot before either is called
done.

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

### The way in — opening a demo, and watching it parse

These two screens are one screen in two states, and they are the whole first impression. Today the
first is a ~450px reading column centred in a 1280px viewport with a dashed box in it: it reads as a
form to fill in, not as a product to use.

- **The drop target is the viewport**, not a box inside it. A file dragged anywhere is caught, and
  the whole screen acknowledges it. A dashed border is the universal signal for *placeholder*, and it
  goes.
- **One card, centred, with room around it.** The card is `--surface-1`, `--radius-float`, and it is
  the only object on the screen. Emptiness here is confidence; filling it with feature bullets would
  be the opposite.
- **Behind it, the product's own material** — a radar plate at very low alpha, bled off the edges,
  the same plate the stage will draw. Not an illustration and not a gradient: the thing the reader
  came for, dimmed. This is the one decorative gesture in the product, and it is decorative only in
  placement.
- **The primary action is the accent.** So is the parse progress bar — §2 fences the accent out of
  every surface that carries side data, and this screen carries none, which is exactly why it is
  where the accent earns its keep.
- **The card transforms in place** when the parse starts; it does not navigate. The heading follows
  §10's rule — "Open demo" leads to "Opening demo" — and the file name, the map and the player count
  fill in as the parser learns them.
- **Nothing here is a spinner.** The parse reports what it is doing in the reader's words, and the
  hidden-tab explanation (#68) belongs on this screen and nowhere else.

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

The stage carries more than dots. Everything in this section except the last item is drawable from
data the parser already emits — `yaw`, `pitch`, `speed`, `health` and `flags` per sample, and
`kills`, `damage`, `grenades`, `blinds`, `plants` and `defuses` as events. **No item here costs the
parser a line or `SCHEMA_VERSION` a bump, and the one that would is called out as such.**

### The player

- **Token** — a shape, not only a colour: CT and T carry different silhouettes, so side survives a
  colour-blind reader and a screenshot. The fill is `--ct`/`--t`. A dead player drops to
  `--ink-faint`, loses its facing and its ring, and stops carrying a name.
- **Name** — every live player is labelled on the plate, in Roboto Condensed 11px on a
  `--glass-raised` chip. Ten unlabelled dots is a puzzle, not a review; the label is what lets a
  reader follow one person through a round. Labels never overlap: a collision moves the label, never
  the token.
- **Facing** — a 2px needle from the token in the side colour, `FLAG_SCOPED` lengthening it. A
  needle, not a wedge, for all ten: ten translucent cones is a fog, and the question "where was he
  looking" is answered by a direction, not by an area.
- **Vision** — the **selected** player gets the wedge as well, at α0.15 fading out by ~1000 units.
  One cone at a time is information; ten is decoration.
- **Damage** — a token flashes `--damage` when its player takes a hit, decaying over ~250ms **of
  match time**, so at 0.5× it is slow and at 4× it is a blink. It is driven by the `damage` events,
  binary-searched by tick like everything else, and its opacity is a function of the clock rather
  than of a timer — an animation keyed to wall time would break §8's rule about playback.
- **Blind** — a blinded player's token loses its facing needle for the duration in the `blinds`
  event, which is the honest picture: a flashed player is not looking anywhere.
- **Planting and defusing** — `FLAG_PLANTING` and `FLAG_DEFUSING` put a progress arc around the
  token. This is the moment a round is decided; it earns its own state.
- **Audibility** — a 1px ring in `--ink-faint` α0.40 at the radius the player can currently be heard
  from, derived from `speed` and suppressed by `FLAG_WALKING`. Drawn **only while the player is
  actually making noise**, plus always for the selected player. Ten permanent rings is noise about
  noise.

### The world

- **Utility** — smokes and fires are areas in their own tokens at low alpha, appearing at
  `detonationTick` and clearing at `expiryTick`, which the schema already carries. Flashes are a
  single expanding mark, not a lingering area.
- **Trajectories** — a grenade's flight path is in `GrenadeTrajectory` as typed arrays, and it draws
  as a 1px line in the utility's own colour from the throw to the detonation. It is the one line on
  the plate that explains a decision rather than reporting a position. It is drawn for a grenade in
  flight, and for a selected grenade in the feed; never for every grenade of the round at once.
- **Levels** — a two-level map draws one at a time, chosen from the 10 Hz readout rather than from
  the clock, or the view flickers between floors as a player crosses the split.
- **Zoom and pan** — the stage supports both, with a `+`/`−` pair and the scroll wheel. A 656px
  plate is enough to see a round and not enough to see a duel. Zoom is a view state, not playback
  state: it survives scrubbing and never moves on its own.

### The bomb — not free, and not to be faked

Showing which T carries the bomb, the way the reference does, **is the one thing on this list the
data cannot do today.** There is no `FLAG_` for it, no pickup or drop event, and `BombPlant` records
`siteEntityId` without a position. Carrying it would mean a new per-sample column or flag and a bomb
position, which is a parser change and a `SCHEMA_VERSION` bump — an `AGENTS.md` §21 decision with its
own issue, not something this document may promise. **The owner's decision is to ship without it and
to keep the gap on the record**: the plate says nothing about the bomb before the plant, and nothing
on the plate may imply otherwise. Anyone who wants it back starts by opening the schema issue.

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
  frame with a library on top of it. This is not a ban on things that *change* on the plate — a
  damage flash, a smoke clearing, a defuse arc filling. Those are **functions of `clock.frame`**,
  computed in the draw the frame was already going to do, and they are the render path rather than
  animation. The test is which clock it reads: match time is drawing, wall time is animating.
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
nothing in the hot path — and it turns the end of a long wait into a payoff. It is described here and
**not yet built** — the one place this document leads the code — and it is #104.

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
- Body text meets 4.5:1 contrast. `--ink-dim` on `--surface-1` is verified at **5.75:1**. `--ink-dim`
  on glass over the map was verified separately, because translucency changes the answer, and it
  **fails** — §2 resolves that by ruling `--ink-dim` off glass over the plate rather than by making
  the glass more opaque.
- Side identity never relies on hue alone: rail side, token shape and hue, in that order of
  reliability.
- Every canvas carries a text equivalent. The spine's round outcomes and economy already do; view
  cones and audibility rings do not need one, because they restate a position the feed already
  reports in words.
- Responsive down to a laptop screen. The tool is not designed for phones; the landing page is.
