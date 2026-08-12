# DESIGN.md

The visual and interaction system for disalytics. Every colour, type, spacing, motion and input
decision in the product derives from this document, and where the code disagrees with it the code is
the thing that is wrong.

**This is the third full revision, and it is a rewrite rather than an amendment.** The first version
(#103) described a "precision instrument" and was implemented faithfully; it read as a wireframe of
its own data. The second kept the instrument framing and softened the surface; it read as competent
and dull. Three revisions arriving at the same complaint — *it looks like 2020 and it does not
surprise* — is evidence that the fault was in the rules, not in their execution. The rules that
produced it were austerity as a virtue, motion as a hazard, and a colour fence so tight the
product's own accent was banned from its main screen.

So the framing changes. The product is not an instrument. **It is a stage with instruments around
it**, and it is allowed to be beautiful while it is accurate.

Engineering constraints that outrank aesthetics live in `AGENTS.md` §16. The one that shaped the
previous two revisions most — §2 rule 9 — is **restated by this document**, not obeyed as it stood;
§8 below carries the new wording and the reason, and `AGENTS.md` is amended to match.

---

## 0. What this revision decides

Settled with the owner on 12 August 2026, before a line of it was written. Each of these was a
"stop and ask" under `CLAUDE.md`, and each is now closed.

| Decision | Consequence |
|---|---|
| **The player rails get live armour, weapon, grenades and money** | `crates/demo-parser` gains four per-sample columns and `SCHEMA_VERSION` goes 3 → 4. Every cached demo is a miss once. §5.3 states what the rails need; the field names are the schema issue's to settle. |
| **`ogl` is an approved runtime dependency** | ~10–15 kB gzip against a 500 kB budget currently 20% used. It buys the two WebGL backgrounds in §10, and it is loaded **only** by the landing and parse screens — never by the review screen, never during playback. |
| **Rule 9 becomes a budget, not a prohibition** | The global `data-playing` kill switch that zeroes every transition is removed. §8 replaces it with a narrow, enforceable rule and a measurement. |
| **The bottom of the screen is the round, not the match** | A round-scoped timeline is the primary control. The whole-match spine survives as a 14px ribbon beneath it — §7. Nothing built by #90, #91 or #92 is thrown away; it is re-scaled. |

Two things this revision deliberately does **not** re-open: there is still no light theme (§2), and
the plate still says nothing about who carries the bomb (§6.4).

---

## 1. Direction

> **The plate is the stage. Everything else is an instrument arranged around it, close enough to
> read without looking away from the middle of the screen.**

The reader is doing forensic work on a recording, repeatedly, for long sessions. That has not
changed and it never will. What changed is the belief that this obliges the interface to be plain.
It does not. A surgical tool is not ugly; it is precise *and* considered, and the considered part is
carried by material, spacing, timing and restraint — not by adding decoration and not by removing
everything until only data remains.

### The four governing principles

> **1. Colour is data, and the product owns exactly one hue that is not.** Sides, damage, utility
> and objectives are the only saturated pixels that mean something. One accent — violet, §2 — is the
> product's own voice and is deliberately far from every data colour, so it can appear anywhere
> without being mistaken for a side.

> **2. Depth is material.** Elevation comes from translucency, a lit rim and a blurred ground, never
> from a drop shadow and never from a gradient. Panels look like a physical layer over the stage
> because that is what they are.

> **3. Motion is feedback, and feedback never waits.** Everything the reader touches answers within
> 120 ms, including while the match is playing. Motion that is not feedback — decoration that moves
> on its own — does not exist, and the render loop is defended by a budget rather than by a ban.

> **4. The middle of the screen is never covered.** No panel, no drawer, no dialog puts itself over
> the plate during review. The layout is arranged so the instruments fit beside the stage, and that
> is also what makes the blur in principle 2 affordable — §2.4.

Interaction state — hover, focus, selection, the playhead — is expressed in **luminance**, never in
hue, so it can never collide with a data colour.

---

## 2. Material

Token names are the short form. In Tailwind v4 they are `--color-*`, and the mapping lives once in
`packages/ui/src/styles/tokens.css` and nowhere else.

**There is still no light theme, and that stays a decision rather than a gap.** `@custom-variant
dark (&)` in `apps/web/src/styles.css` makes the dark appearance unconditional. A second palette
would double the token layer, re-open every contrast check in this section and need a third radar
plate. This closes the open question in `AGENTS.md` §20: the light/dark provider promised by
`CODE_REQUIREMENTS.md` §1 is dropped from the docs rather than built.

### 2.1 Ground — near-black, barely blue, and darker than before

The previous palette sat at `#0E1216`, a visibly blue graphite. It was chosen to avoid the
black-plus-neon cliché and it succeeded, at the cost of looking like a slightly dusty screen. This
revision goes darker and more neutral: dark enough that a glass panel reads as a lit object, neutral
enough that the plate's own colour is the only hue in the frame.

```css
--surface-0: #08090B;   /* the stage: app ground, behind everything */
--surface-1: #0F1114;   /* structural panels: the timeline block, settings sheets */
--surface-2: #171A1E;   /* raised: menu items, hovered rows, inputs */
--line:      #262A30;   /* hairlines and panel edges */
--line-soft: #1C2025;   /* internal dividers */
--ink:       #F4F6F8;   /* primary text */
--ink-dim:   #98A1AC;   /* secondary text and labels */
--ink-faint: #616A75;   /* disabled, axis ticks, audibility rings — never body text */
```

Measured, not asserted:

| | `--surface-0` | `--surface-1` | `--surface-2` |
|---|---|---|---|
| `--ink` | **18.39:1** | 17.45:1 | 16.11:1 |
| `--ink-dim` | **7.62:1** | 7.23:1 | 6.67:1 |
| `--ink-faint` | 3.63:1 | 3.45:1 | 3.18:1 |

`--ink-dim` clears the 4.5:1 floor with room to spare on every opaque surface, which the previous
palette only just managed. `--ink-faint` fails it everywhere and is therefore confined to
non-text use — rings, ticks, the dead-player token — exactly as before.

### 2.2 Glass — three grades, and the rule for which one

```css
--glass-panel:  rgb(15 17 20 / 0.62);    /* the corner cards, the timeline block */
--glass-raised: rgb(23 26 30 / 0.80);    /* menus, popovers, tooltips over a card */
--glass-sheet:  rgb(8 9 11 / 0.88);      /* settings and help, which cover the screen */
--glass-edge:   rgb(255 255 255 / 0.08); /* the 1px inner top rim that reads as lit */
--glass-hair:   rgb(255 255 255 / 0.05); /* the 1px outer edge on a floating card */
```

A card picks its grade by **what it must let through**: the stage → `panel`, another card →
`raised`, the whole screen → `sheet`.

Composited, `--glass-panel` over `--surface-0` lands at `#0C0E11`, where `--ink` reads **17.84:1**
and `--ink-dim` **7.39:1**. That is the case the review screen is built around, because §1's fourth
principle guarantees no card ever sits over the plate.

**Where a panel does end up over plate pixels — a tooltip near the middle, a menu on a narrow
window — text on it is `--ink` and nothing else.** Over the worst ground on the plate (the bombsite
yellow the `blue` theme keeps saturated on purpose, `#FFCA3D`) `--glass-panel` composites to
`#6A5724`, where `--ink` still reads **6.46:1** but `--ink-dim` collapses to **2.67:1**. Secondary
text in that situation is secondary by size and weight, never by ink level. This is the same
conclusion #119 reached against the old palette, and it survives the new one.

### 2.3 Blur is allowed now, and §1's fourth principle is what pays for it

The previous revision banned `backdrop-filter` outright, and the reasoning was sound for the layout
it described: panels floated over a canvas repainting at display rate, so every frame forced the
compositor to re-blur. That layout is gone. In §5 the plate is **sized so that no card overlaps
it**, which means every blurred panel in the product has a *static* ground behind it, and a blur
over a static ground is paid for once.

```css
--blur-panel: blur(24px) saturate(1.25);
--blur-sheet: blur(40px) saturate(1.1);
```

The rule, and it is enforceable by looking at the layout rather than by trusting a reviewer:

- **A surface may use `backdrop-filter` only if nothing behind it repaints per frame.** The corner
  cards, the timeline block, menus, dialogs and the two full-screen sheets all qualify.
- **A surface that does overlap a live canvas uses alpha alone**, no blur. That is the tooltip case
  above, and it is the only case.
- Every blurred surface carries an opaque fallback colour for `@supports not (backdrop-filter:
  blur(1px))`, which is also what a reader with the effect disabled gets.
- `--blur-sheet` runs only on screens where playback is stopped by definition.

`AGENTS.md` §16 gains an assertion for this: the review screen holds 60 fps with every card blurred,
on the reference machine, on the 264 MB fixture. If it does not, the blur is what goes — not the
layout.

### 2.4 Data colours — semantic only, never decorative

```css
--ct:            #4FA3FF;   /* Counter-Terrorist */
--t:             #FFB84D;   /* Terrorist */
--damage:        #F04248;   /* a hit landing, and a kill mark */
--nade-he:       #FF9F1C;
--nade-flash:    #F2F6FF;
--nade-smoke:    #8B95A3;
--nade-molotov:  #FF6B35;
--objective:     #D14FA0;   /* plant and defuse — deliberately outside both team hues */
```

`--ct` and `--t` measure **ΔE2000 53.00** apart, at **7.60:1** and **11.59:1** on the stage. That is
the one pair a reader must never confuse and it is the furthest-apart pair in the palette.

**`--kill` is deleted.** It measured ΔE2000 **6.47** from `--damage` — two tokens a reader cannot
tell apart, carrying a distinction the reader does not need to make by hue. A kill is distinguished
from damage by *shape*: a kill is a glyph, damage is a wash. One fewer token, one fewer lie.

A semantic colour may only be used for the thing it names. An aggregate is not a semantic: "how much
happened in this minute" is not damage, and is drawn in `--ink-dim`.

### 2.5 The accent — violet, and no longer fenced

```css
--accent:      #B07CFF;
--accent-ink:  #08090B;   /* text on an accent fill */
```

The old accent was `#65A1F8`, which sat **ΔE2000 6.59** and **5.84°** of hue from `--ct`. The
previous revision correctly concluded that such an accent cannot appear on a screen showing CT
players, and then spent four paragraphs explaining why the main screen therefore has no accent at
all. That is the wrong end of the problem to solve. **Move the accent instead.**

`#B07CFF` measures **ΔE2000 24.93** from `--ct` (34.7° of hue), **59.30** from `--t`, **37.66** from
`--damage`, and **20.40** from `--objective` — the closest of the four, and the two never appear
within a glance of one another. It reads **6.80:1** on the stage.

So the fence is gone, and the accent is free:

- **Yes** on the landing, the library, the parse screen, primary actions, the active state of a
  segmented control, the focused settings row, the selection halo's inner edge, the round-timeline
  playhead's shadowless glow. It is the product's voice and the main screen is allowed to have one.
- **No** as a fill on anything that represents a *player*, a *side*, a *weapon* or an *event*. That
  boundary is principle 1 and it does not move. - **It is a fill or a 2px rule, never body text on
  `--surface-0`.** Accent text beside ink text reads as a link where none exists.
- It does not replace an interaction state. Focus is white, selection is white, hover is white. The
  accent says *this is the thing to press*; luminance says *this is where you are*.

### 2.6 Interaction

```css
--focus:    #FFFFFF;                    /* 2px ring, always visible, never removed */
--selected: rgb(255 255 255 / 0.12);
--hover:    rgb(255 255 255 / 0.06);
--press:    rgb(255 255 255 / 0.03);
--playhead: #FFFFFF;
```

**The playhead is the brightest thing on screen and nothing else is allowed to be.** This clause
outranks any wish for a louder chart, and it survives every revision.

### 2.7 The plate

"Colour is data" does not reach the map image. The plate carries colour that encodes *space* —
playable floor against void, one level against another, Valve's own bombsite outlines — and that is
information about the map. What it may not do is compete: **the plate stays below every player token
and every event mark in both saturation and value.**

`blue` stays the default theme and `vanilla` is selectable in settings. Which one is better is
settled by looking at ten tokens on top of both, never by looking at the plate alone.

Every semantic colour needs a colour-blind-safe variant selectable in settings — this absorbs #81,
and it matters more in this revision than the last, because §6.1 gives up token *shape* as a carrier
of side identity. After this revision side identity has two carriers: hue, and which card the player
is listed in. That is a real reduction and the colour-blind palette is what pays for it; it is no
longer a nice-to-have and it ships with the rails.

---

## 3. Typography

Unchanged in its choices and sharpened in its use. All three faces are free, self-hosted,
offline-capable, and had their Cyrillic coverage verified **in the font file** — the rule that
killed Archivo (653 codepoints, none in `U+0400–04FF`) and IBM Plex Sans Condensed (`cyrillic-ext`
without the basic block). A typeface is not a candidate for this product until that check has run.

| Role | Face | Use |
|---|---|---|
| Display / UI | **Wix Madefor Display** (600, 500) | headings, buttons, section labels, the round number |
| Dense labels | **Roboto Condensed** (500) | player names, table headers, chips, plate labels |
| Data | **IBM Plex Mono** (400, 500) | every number, tick, coordinate, timestamp, score |

### Rules

- **Every number is IBM Plex Mono with `font-variant-numeric: tabular-nums`.** No exceptions. Digits
  that change width while a clock runs are the loudest amateur signal in a data UI.
- Type scale (px): `10 · 11 · 12 · 13 · 14 · 16 · 20 · 28 · 44`.
- **Optical tracking is part of the scale, and this is the addition this revision makes.** Display
  sizes are set tight and small sizes loose: `44 → -0.03em`, `28 → -0.02em`, `20 → -0.01em`,
  `16/14/13 → 0`, `12/11/10 → +0.01em`, uppercase labels `+0.06em`. Type that is not optically
  corrected is the difference between a screen that looks drawn and one that looks typed.
- `44` exists and appears **once per screen** — the round number over the stage, the way a broadcast
  captions a round. Two of them and the effect is gone.
- Line height 1.25 in dense rows, 1.5 in prose.
- Labels are Roboto Condensed 11px, uppercase, `+0.06em`, `--ink-dim`. `.label-dense` carries type
  only and **no colour**; every caller names its own ink level (#110).
- Sentence case everywhere else. No title case, no all-caps body text.

---

## 4. Depth, Radius, Spacing, Size

```css
--radius-chip:  6px;    /* chips, cells, inline marks */
--radius-card:  10px;   /* rows, inputs, buttons, popovers */
--radius-float: 16px;   /* anything floating over the stage: cards, timeline block, dialog */
--radius-sheet: 20px;   /* the settings and help sheets */
/* full pill: segmented controls, toggles and the speed control only */
```

A component picks by **what it sits on**, never by taste: on the stage → `float`, in a card →
`card`, inside a row → `chip`.

- **Elevation is a 1px `--glass-hair` outer edge plus a 1px `--glass-edge` inner top rim**, over a
  blurred ground. That combination is what makes a card read as a physical layer. Drop shadows are
  reserved for surfaces that must escape the layout entirely — dialog and menu — and there they are
  large, soft and offsetless: `0 24px 64px rgb(0 0 0 / 0.55)`.
- **A floating element is translucent; a structural one is opaque.** There is very little structure
  left on the review screen — that is the point of §5.
- **4px spacing grid.** Every gap, pad and size is a multiple of 4. Card padding is 16, card gap is
  12, the stage inset is 24.
- **Two control heights exist and no others**: **32px** dense and **40px** primary. The current
  build has 24, 28, 32 and 36 because the override only catches shadcn's `.h-9`; the fix is a real
  size variant in `@disa/ui`, not another override.
- Hairlines stay 1px at every device pixel ratio.
- **`border-t` does not draw a top border.** `--color-t` claims Tailwind's `t` namespace, so a top
  hairline is `[border-block-start:1px_solid_var(--color-line)]`. `border-b`, `border-l` and
  `border-r` are unaffected.

---

## 5. Layout — the review screen

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐                                      ┌─┬─┬─┬─────────┐ │
│ │  14             │                                      │⛶│⚙│?│         │ │
│ │  de_nuke        │                                      └─┴─┴─┴─────────┘ │
│ │  CT 8 : 5 T     │              ┌───────────┐           ┌───────────────┐ │
│ │  1:47           │              │           │           │  s1mple ✧ b1t │ │
│ └─────────────────┘              │           │           │  ZywOo ✧ jL   │ │
│                                  │   PLATE   │           │  ● PLANTED    │ │
│                                  │           │           │  ...          │ │
│ ┌─────────────────┐              │           │           └───────────────┘ │
│ │ T               │              └───────────┘                             │
│ │ ▸ five rows     │                                      ┌───────────────┐ │
│ │   hp armour $   │                                      │ CT            │ │
│ │   weapon nades  │                                      │   five rows   │ │
│ └─────────────────┘                                      └───────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │  ▶   ├──💀─────────💣──────💀──┤                                  1× ▾  │ │
│ │  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ match ribbon ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

There is no top bar, no rails and no inspector column. There is a plate in the middle and four
floating cards around it, and everything else the previous layout spent structure on is either on a
card or gone.

### 5.1 The plate sizes itself so nothing covers it

This is the load-bearing rule of the whole layout, and §2.3 depends on it.

```
plate = min(
  100cqb - timeline-block - 2 * inset,
  100cqi - 2 * (card-width + gap) - 2 * inset
)
```

At 1440×900 that is a **660px** plate with 300px of clear column on each side — enough for a 280px
card. At 1280×800 it is 596px. Both are larger than the 479px the pre-#87 layout produced and larger
than the 656px figure the previous revision claimed for a layout with rails, because a card that
floats costs the plate nothing until the window is narrow.

The plate keeps its aspect ratio and is **never cropped or letterboxed**.

**Below 1280px** the cards dock to the viewport edges and the plate takes what is left, still
uncovered. **Below 1080px** the two team cards merge into a single strip above the timeline block,
and the blur rule in §2.3 still holds because that strip is not over the plate either. The tool
targets a laptop and up; the phone is the landing page's problem.

### 5.2 Top-left — the round card

Round number at `44`, map name, score, and the round clock. Four values, one card, no chrome around
them. The score is the one place a `--ct`/`--t` pair appears outside the plate and the team cards,
because a score *is* side data.

The round number is a button: pressing it opens the match ribbon full-height as an overlay (§7.3).

### 5.3 Bottom-left and bottom-right — the team cards

**T is bottom-left, CT is bottom-right.** This inverts the previous revision's CT-left convention on
the owner's call; it matches how the reader already reads a scoreboard and it is now the *only*
positional carrier of side identity, so it is fixed and never configurable.

Five rows per card, each row carrying, in this order:

| Field | Source | Note |
|---|---|---|
| name | `PlayerInfo.name` | Roboto Condensed 13, `--ink`; `--ink-faint` when dead |
| health | `TickTrack.health` | a 3px bar in the side colour, plus the number in Plex Mono 12 |
| armour | **new column** | a 3px bar under health in `--ink-dim`; a helmet glyph when the flag is set |
| money | **new column** | Plex Mono 12, `--ink-dim`, prefixed by the locale's currency rule |
| weapon | **new column** | the weapon glyph, `--ink`; game vocabulary, never translated |
| grenades | **new column** | up to five 10px glyphs in each utility's own colour |

Four of those six do not exist in `SCHEMA_VERSION` 3 and are the reason for the bump in §0. What the
rails need, for the schema issue to name properly: **armour** per sample (`Uint8`, with helmet as a
new `flags` bit), **current weapon** per sample (`Uint8` index into a per-match weapon table on
`MatchHeader`, 255 for none), **grenades held** per sample (a `Uint8` bitfield — HE, two flash
slots, smoke, fire, decoy, defuse kit fit in one byte), and **money** per sample (`Uint16`). That is
5 bytes on top of the current 20 per player per sample: **+1.9 MB on a 40-minute match at 16 Hz**,
against a 1.5 GB peak budget. The cost is not the memory; the cost is one cache generation.

A row is a button. Pressing it selects that player — the vision wedge, the plate halo and the
inspector all key off the same selection, which is React state in `features/review` and never a
canvas hit test (#111). Selection survives scrubbing and round changes.

Rows are ordered by slot and never re-sorted while the match plays. A list that re-orders itself
under the reader's cursor during playback is the single worst thing a live scoreboard can do.

### 5.4 Top-right — the corner cluster and the feed

A 40px strip of icon buttons pinned to the top-right corner: **fullscreen**, **settings**, **help**.
They sit at `--ink-faint` and rise to `--ink` on hover or focus, and the whole cluster fades up when
the pointer enters the top-right quadrant of the stage — the hot corner in §9.3. They are always
reachable by keyboard regardless of pointer position.

Beneath the cluster, the **event feed**: the last events before the playhead, newest at the top,
capped at eight rows and clipped to the current round. A row is *attacker · weapon glyph · victim*
with the two names in their side colours, plus a headshot mark, a wallbang mark and a through-smoke
mark where the schema says so. Objective events (plant, defuse) get a full-width row in
`--objective`.

The feed is the one place in the product where **a new item animates in while playback runs**, and
§8 permits it explicitly: it is a discrete, event-triggered arrival at the rate the match produces
kills, not a per-frame tween.

Pressing a feed row seeks to that event. Hovering one draws the kill's line on the plate.

### 5.5 The timeline block

A single floating card at the bottom holding, left to right: the **play/pause** button (40px,
primary), the **round timeline** (§7.1), and the **speed control** (§7.2). Beneath them, flush to
the card's bottom edge, the **match ribbon** (§7.3) at 14px.

The block is `--glass-panel`, `--radius-float`, and it spans the width between the two team cards'
outer edges. Total height 96px including the ribbon — the previous layout spent 205px on the same
job.

### 5.6 The inspector

There is no inspector column and no drawer over the stage — principle 4 forbids the drawer and the
column was dead weight on every screen where nobody was selected. **Selecting a player expands that
player's row in place**, inside its team card, into a taller block carrying the round's numbers for
them. The card grows downward into the stage inset; it does not cover the plate.

Anything that needs more room than that is not an inspector, it is a screen, and it goes behind the
settings sheet's sibling — the stats view, which is Phase 6's problem.

---

## 6. The plate

Everything in this section except §6.4 is drawable from data the parser emits or will emit under §0.

### 6.1 The player

- **Token — a filled circle, no stroke, 16px at 1× zoom**, scaling with plate zoom within 12–20px.
  This is the owner's call and it retires the previous revision's per-side silhouettes; §2.7 records
  what that costs and what pays for it.
- **Facing** — a 2px needle in the side colour, 10px long, extending to **18px while `FLAG_SCOPED`
  is set**. A needle for all ten, never a cone: ten translucent cones is a fog, and *where was he
  looking* is answered by a direction.
- **Vision** — the **selected** player also gets a wedge, α0.15, fading out by ~1000 units. One cone
  is information; ten is decoration.
- **Selection** — a 1.5px white ring at 2px offset from the token, with an `--accent` inner edge.
  This is the one exception to "no stroke", and it exists because selection must be readable against
  both side colours and against the plate.
- **Damage** — the token's fill crosses to `--damage` and back over ~250 ms **of match time**, so at
  0.5× it is slow and at 4× it is a blink. Driven by the `damage` events, binary-searched by tick,
  opacity a function of `clock.frame`. Scrubbing backwards through a hit shows the flash again,
  which is the correct behaviour and the test for whether it was built right (#112).
- **Blind** — a blinded player loses the facing needle, and gains a **countdown disc**: a
  `--nade-flash` overlay at α0.5 covering the token, sweeping away anticlockwise over the `Blind`
  event's `durationSeconds`. A flashed player is not looking anywhere, and the reader can see how
  much longer that will be true.
- **Planting and defusing** — `FLAG_PLANTING` / `FLAG_DEFUSING` draw a progress arc around the token
  in `--objective`. This is the moment a round is decided; it earns its own state.
- **Death** — the token drops to `--ink-faint` at α0.5 and shrinks to 8px over ~200 ms of match
  time, loses its needle, its ring and its name, and stays on the plate. A body that vanishes takes
  the information about *where* it happened with it.
- **Name** — every live player is labelled: Roboto Condensed 10px, `--ink-dim`, with a 2px
  `--surface-0` halo rather than a glass chip. The chip #111 shipped was the right instinct and the
  wrong weight — a background per label is ten more rectangles on a plate that now has ten larger
  tokens. Labels never overlap: **a collision moves the label, never the token**, and the placer
  resets per frame so placement is a function of the frame rather than of history.
- **Health is not on the plate.** The team card carries it. The only health state the plate shows is
  dead.
- **Audibility** — a 1px ring in `--ink-faint` α0.40 at the radius the player can currently be heard
  from, from `speed`, suppressed by `FLAG_WALKING`, drawn only while the player is actually making
  noise. **Off by default**, toggled in settings and remembered — it is the largest mark on the
  plate and it competed with the players (#112). The model is a named approximation of an
  unpublished falloff and the UI says so.

### 6.2 Utility

Each type has a state on the plate and none of them is a spinner.

- **Trajectory** — the flight path from `GrenadeTrajectory`, a 1px line at α0.35 in **white**, not
  in the utility's colour. It is drawn for a grenade **in flight** and for a grenade selected in the
  feed; never for every grenade of the round at once. White because a path is not the grenade — it
  is where the grenade *was*, and colouring it competes with the detonation that matters.
- **HE** — at `detonationTick`, an expanding ring in `--nade-he` reaching its effective radius over
  ~200 ms of match time, then a small static glyph for ~1 s of match time. It is over quickly
  because the thing itself is over quickly.
- **Flash** — a single expanding mark in `--nade-flash`, no lingering area. What lingers is on the
  affected players (§6.1), which is where the information actually is.
- **Smoke** — a soft `--nade-smoke` disc at α0.30 from `detonationTick` to `expiryTick`, with a 1px
  ring around it that depletes clockwise as the cloud's remaining life runs out. The last ~2 s of
  match time fade the disc's alpha to zero rather than cutting it.
- **Molotov / incendiary** — a `--nade-molotov` area at α0.25 with a soft irregular edge, same
  depleting ring, same fade-out.
- **Decoy** — a small pulsing mark; it is a lie the reader should be able to see was told.

All of the above are **functions of `clock.frame`**, computed inside the draw the frame was already
going to do. §8's test applies: match time is drawing, wall time is animating.

### 6.3 The world

- **Levels** — a two-level map draws one at a time, chosen from the 10 Hz readout rather than from
  the clock, or the view flickers between floors as a player crosses the split.
- **Zoom and pan** — scroll wheel, a `+`/`−` pair on the plate's bottom-right, and `Cmd`/`Ctrl` +
  drag. Zoom is a *view* state, not playback state: it survives scrubbing and never moves on its
  own. Double-click resets.
- The debug overlay is a development affordance and lives behind the settings sheet, never on the
  stage.

### 6.4 The bomb — still not free, still not faked

Showing which T carries the bomb is the one thing on this list the data cannot do. There is no
`FLAG_` for it, no pickup or drop event, and `BombPlant` records `siteEntityId` without a position.
The §0 schema bump does **not** include it, because carrying it means a bomb entity position and a
carrier column — a bigger change than the four the rails need, with its own issue.

**The plate says nothing about the bomb before the plant, and nothing on the plate may imply
otherwise.** Anyone who wants it opens the schema issue first.

---

## 7. Time

### 7.1 The round timeline — the primary control

The strip between play/pause and the speed control shows **one round**, from `startTick` to
`endTick`, and nothing else.

- **The buy phase is a distinct region** — `startTick` to `freezeTimeEndTick`, drawn at
  `--surface-2` with a hairline at its end. When auto-skip is on (§10.5) the region is drawn hatched
  and the playhead jumps it.
- **Events are glyphs on the axis, not ticks**: a skull for a kill in `--damage`, a bomb for the
  plant and a cutter for the defuse in `--objective`, a small utility glyph per grenade in its own
  colour. Below a threshold density the glyphs collapse to marks; the round is 1:55 and this is the
  one timeline in the product with room for symbols.
- **Kills by the selected player rise; everything else drops to `--ink-faint`.** This is where the
  "loud" the previous revision promised the spine actually belongs, and it only happens in answer to
  a question.
- **The playhead is 1px pure white** with a 2px `--accent` glow beneath it, and it moves with
  `transform` only. The scrubber underneath stays an **uncontrolled** range input — React never owns
  its value (#83).
- Hovering the axis shows a time readout and the frame under the cursor; pressing seeks.

### 7.2 The speed control

A pill on the right of the block reading the current rate in Plex Mono. Pressing it opens a
`--glass-raised` menu of `0.25× · 0.5× · 1× · 2× · 4×`; scrolling on it steps through them. The
active entry is `--accent`. The pill also shows a `⏵⏵` mark while a held arrow key is
fast-forwarding (§9.1), so a temporary rate never looks like a setting the reader changed.

### 7.3 The match ribbon

14px, flush to the timeline block's bottom edge, spanning its full width: the whole match at a
glance, and everything #90, #91 and #92 built, re-scaled to a navigation strip rather than a chart.

- **Round bands** tinted `--ct` / `--t` by winner at α0.14, with `--line` hairlines between them.
- **The economy gap** as a 4px band leaving the centre line, side-tinted at α0.32.
- **The event-density trace** in `--ink-dim` α0.30. It is an aggregate, not damage, and §2.4 forbids
  spending a semantic colour on it. Monochrome also makes it read as terrain, which is what it is.
- **The current round is lit**: its band drops the tint and gains a 1px `--glass-edge` frame.
- Pressing a band seeks to that round's `freezeTimeEndTick`.
- Kill marks and per-round detail are **not** on the ribbon at 14px. They are on the round timeline,
  where they fit.
- Pressing the round number in the top-left card (§5.2) raises the ribbon into a full-height
  overlay with the kill marks, the round outcomes and the density trace at readable size — this is
  the previous revision's spine, and it is one keystroke away rather than always present.

**`RoundOutcomes` and `EconomyGaps` stay.** `role="img"` announces that a picture exists and nothing
about what it shows; the `sr-only` lists are what make the ribbon readable without eyes (#92), and
shrinking the canvas does not shrink that obligation.

---

## 8. Motion

The previous revision's rule was: *nothing animates on the main thread while playback runs*,
enforced by writing `data-playing` on the document element and zeroing every transition and
animation beneath it. It was honestly reasoned and it was too broad. What it actually shipped was an
interface where hovering a button during playback did nothing, a selection changed with a jump cut,
and a kill appeared in the feed by teleporting — during exactly the activity the product exists for.
An interface that stops responding while it is working reads as broken, not as disciplined.

### The rule, restated

> **Nothing on the frame channel may animate, and nothing may animate a property that triggers
> layout. Everything else may animate whenever it likes, including during playback, and the review
> screen holds 60 fps with all of it running.**

Concretely, and this replaces `AGENTS.md` §2 rule 9:

1. **Nothing subscribed to `clock.frame` may touch React, and nothing on that channel may start an
   animation.** This is the rule that was always the real one. It is unchanged and it is absolute.
2. **`transform` and `opacity` only.** Never `width`, `height`, `top`, `left`, `margin`, `filter` or
   `backdrop-filter` in a transition. A property that triggers layout is banned at every moment, not
   only during playback.
3. **Inside the radar and ribbon canvases there are no tweens.** Things that change there — the
   damage flash, the smoke depleting, the defuse arc — are functions of `clock.frame`, computed in
   the draw the frame was already going to do. **The test is which clock it reads: match time is
   drawing, wall time is animating.**
4. **Animations are discrete and event-triggered.** A hover, a focus, a selection, a card opening, a
   feed row arriving. Nothing loops, nothing breathes, nothing animates because time passed. The
   review screen has no ambient motion at all — that is reserved for the landing and parse screens,
   which have no clock to compete with.
5. **The frame budget is the enforcement.** `AGENTS.md` §16's 60 fps assertion gains the review
   screen with every card blurred and the feed animating, on the reference machine and the reference
   fixture. When something in this section costs the budget, that thing goes.

`bindPlayingFlag` and the `data-playing` reset in `packages/ui/src/styles/motion.css` are removed by
the issue that implements this. The `prefers-reduced-motion` reset stays and is now the only global
motion override, which is also what lets it stop using `:where()` for specificity reasons that no
longer exist.

```css
--motion-instant: 90ms;    /* press */
--motion-micro:   140ms;   /* hover, focus, toggle, feed row */
--motion-base:    220ms;   /* card content, tooltip, selection */
--motion-panel:   340ms;   /* sheet, dialog, view change */
--ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:    cubic-bezier(0.4, 0, 1, 1);
--ease-spring: linear(0, 0.42, 0.86, 1.04, 1.02, 1);
```

`--ease-out` is deliberately a strong decelerating curve rather than the previous
`cubic-bezier(0.2, 0, 0, 1)`. It is the single cheapest change in this document: motion that arrives
fast and settles slowly is what separates an interface that feels expensive from one that feels
linear.

`prefers-reduced-motion: reduce` collapses every duration except opacity fades, stops both WebGL
backgrounds on a static frame, and is implemented once in `packages/ui/src/styles/motion.css`.

### The one orchestrated moment

When a parse completes, the interface assembles rather than appearing: the plate fades up, the four
cards arrive from their own corners over ~400 ms, the ribbon draws left to right as the data lands,
and the players take their opening positions. It runs exactly once per demo, while nothing is
playing, so it costs nothing in the hot path — and it turns the end of a long wait into a payoff. It
is #104 and it is still not built.

No other orchestrated sequence exists.

---

## 9. Input

The product is used by one person, for an hour, with one hand on the keyboard. Input design is not
an accessibility footnote here; it is the primary interface, and the pointer is the fallback.

### 9.1 Keyboard

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` `→` | seek back / forward by the configured step (§10.5, default 10 s) |
| **hold** `←` `→` | fast-forward or rewind at 2× while held; releasing restores the previous rate |
| `,` `.` | step one frame back / forward |
| `[` `]` | previous / next round |
| `1`–`5` | select the T player in that row |
| `6`–`0` | select the CT player in that row |
| `Esc` | clear selection; close the topmost sheet, overlay or menu |
| `F` | fullscreen |
| `M` | raise the match ribbon overlay |
| `+` `−` `0` | zoom in, out, reset |
| `?` | help |

A held arrow is a **rate change, not a repeat**: `keydown` raises the rate to 2× in the seek
direction and `keyup` restores it, so the reader scrubs continuously rather than in steps. The
transport is the only thing that knows about this; the speed pill reflects it (§7.2) and does not
own it. `keyup` is also bound on `blur` and `visibilitychange`, or a key released outside the window
leaves the match running at 2× forever.

Every binding lives in `core/shortcuts`, appears in the help sheet generated from the same table,
and none of them fires while focus is in a text field.

### 9.2 Pointer

- The plate: wheel zooms, drag pans, double-click resets, hovering a token shows the player's name
  and the pointer's own world coordinate when the debug overlay is on.
- Feed rows and ribbon bands seek. Team rows select.
- Every hoverable element answers in `--motion-micro`, including during playback.
- Tooltips are `--glass-raised`, appear after 400 ms, and never carry information that exists
  nowhere else.

### 9.3 Hot corners

The stage's four corners are live regions, and the pointer entering one raises what belongs there
without a click:

- **Top-right** — the fullscreen / settings / help cluster fades from `--ink-faint` to `--ink`.
- **Bottom edge** — in fullscreen, where the timeline block auto-hides after 3 s of stillness, the
  bottom 80px brings it back.
- **Top-left and bottom corners** otherwise carry cards that are always visible; there is nothing to
  reveal and no hot corner there.

Hot corners are an accelerator and never the only route: everything they reveal is reachable by
`Tab` and has a keyboard binding.

---

## 10. Screens

### 10.1 The landing

The way in, and the first impression. Today it is a ~450px reading column with a dashed box in it,
which reads as a form to fill in.

- **A full-bleed WebGL Prism background** (reactbits, on `ogl`, approved in §0), retuned to the
  palette: the product's violet accent through `--ct` blue, on `--surface-0`, at a speed slow enough
  to be atmosphere rather than an event. It stops on a static frame under `prefers-reduced-motion`,
  and it is torn down the moment the reader leaves the screen — it never coexists with a plate.
- **The whole viewport is the drop target.** A file dragged anywhere is caught and the whole screen
  acknowledges it. The dashed border goes; a dashed border is the universal signal for
  *placeholder*.
- **One glass card, centred, with room around it**: the product name, one line of what it does, the
  primary action in `--accent`, and beneath it the saved-demo list when there is one (§10.2).
- **Three entries, two of them honest about being unfinished.** *Review a match* is live. *Utility
  lineups* and *Player stats* are listed at `--ink-faint` with a "soon" chip, and pressing one says
  what it will do and nothing else. This is the groundwork the owner asked for: the navigation
  shape exists now so that adding the screens later is not a redesign.
- Emptiness here is confidence. Feature bullets would be the opposite.

### 10.2 The saved demos list

A demo that has been opened once opens again instantly — the store already reads a cached parse back
in **0.02 s** against 18.6 s to parse it. What is missing is not speed, it is a list: `CatalogEntry`
records `key`, `byteLength` and `lastUsedAt`, which is enough to evict an entry and not enough to
name one.

- The catalog gains the metadata a human needs: **file name, map, score, round count, date parsed**,
  written at the same moment the demo is stored.
- The list shows the most recent five on the landing card, all of them on the library screen: map
  name, score in Plex Mono, the two team names where the demo gives them, the date, and the size.
- **Pressing one opens it from the cache without a file**, which is the whole point of the feature.
- Each entry has a remove control. Removal is immediate and unconfirmed — it deletes a cache entry,
  not a demo; the reader's `.dem` is untouched on disk and the copy says so.
- An entry whose `SCHEMA_VERSION` no longer matches is **not shown**. It is unreachable by
  definition and the store already drops it on open; a list entry that cannot be opened is worse
  than no entry.
- The list is storage state, not a preference, so it lives in the store's catalog and never in
  `localStorage` — hard rule 5.

### 10.3 The parse screen

The same screen as the landing, transformed in place. It does not navigate.

- **The Radar background** (reactbits, `ogl`, §0), tuned to `--accent` on `--surface-0`, sweeping at
  a rate tied to nothing — it is atmosphere, not a progress indicator, and it must never be mistaken
  for one.
- **Over it, the number**: the percentage at `44` in Plex Mono, and beneath it the stage in the
  reader's words. "Reading the demo", "Following the players", "Collecting the rounds" — never
  "Initializing WASM module".
- **The card fills in as the parser learns**: file name first, then map, then player count.
- **Nothing here is a spinner**, and the hidden-tab explanation (#68) belongs on this screen and
  nowhere else — a backgrounded tab parses ~5× slower and the reader deserves to know that before
  they conclude the product is broken.
- Cancel is always available and says "Cancel parse".

### 10.4 The failure screen

Same card, same place. The error states what happened and what to do, in the interface's voice,
without apologising:

> **This is a POV demo.** Only match demos (GOTV) contain data for all ten players.
> Download the match demo from your match history and try again.

### 10.5 Settings

A `--glass-sheet` panel over the whole screen, not a dialog and not a drawer — playback pauses while
it is open, so principle 4 is not violated by covering a plate that is not moving.

| Group | Setting | Default |
|---|---|---|
| Playback | **Skip the buy phase** — playback jumps `startTick` → `freezeTimeEndTick` at every round | off |
| Playback | **Seek step** — 5 / 10 / 15 s, used by `←` `→` | 10 s |
| Playback | **Held-arrow rate** — 2× / 4× | 2× |
| Plate | Radar theme — `blue` / `vanilla` | `blue` |
| Plate | Audibility rings | off |
| Plate | Player names on the plate | on |
| Plate | Grenade trajectories — in flight / selected only / off | in flight |
| Colour | Colour-blind-safe side palette | off |
| Interface | Language — English / Русский | system |
| Interface | Reduce motion | follows the system |
| Developer | Debug overlay — coordinates and frame counters | off |

**Skip the buy phase is a playback rule, not a rendering one**: the transport performs the jump, so
scrubbing into the buy phase by hand still works and still shows it. A setting that made the buy
phase unreachable would be a bug, not a feature.

Every setting is a UI preference and therefore allowed in `localStorage` under hard rule 5. Nothing
parsed goes there.

### 10.6 Help

A `--glass-sheet` sibling of settings, opened by `?` or the corner cluster. Three parts: what the
product does in four sentences, the keyboard table from §9.1 **generated from the same source as the
bindings**, and a legend of every mark on the plate — token states, utility states, the objective
arc. A legend that is written by hand drifts from the renderer within two issues; this one reads the
same tokens the renderer does.

---

## 11. Components

[Animate UI](https://animate-ui.com) is the component layer, on the shadcn model — source copied
into the repository, no component package at runtime — built on `motion`, which is a runtime
dependency approved under hard rule 10 at roughly 30–35 kB gzipped.

- **Components live in `packages/ui`**, re-exported from `@disa/ui`. `motion` enters the tree
  through exactly one `MotionProvider`, a `strict` `LazyMotion`, so `motion.*` throws and `m` is the
  only way to animate. Registry aliases are package.json `imports` (`#components`, `#lib`, `#hooks`)
  because a package-local `@/` is impossible here.
- Any shadcn copies still in `apps/web/src/shared/components/ui` move to `packages/ui`. This is not
  tidying: §4 says two control heights exist, and there is nowhere else that can be true.
- An Animate UI component that animates something §8 forbids is **edited, not adopted as shipped**.
  The library is a starting point for a component, never an argument for breaking a rule.
- The two WebGL backgrounds are vendored the same way — copied into `packages/ui`, retuned to the
  palette, and **lazy-loaded**, so `ogl` never enters the review screen's chunk.
- Icons come from the animated Lucide set, per icon, never as a barrel import. Weapon and utility
  glyphs are the product's own SVG set, sized on the 4px grid, and they are game vocabulary — never
  translated, never re-drawn per locale.

---

## 12. Copy

- Name things by what the reader controls, never by how the system works. "Reading the demo", not
  "Initializing WASM module".
- Buttons say what happens: "Open demo", "Cancel parse", "Clear filters". Never "Submit", "OK".
- An action keeps its name through the whole flow. "Open demo" leads to a screen headed "Opening
  demo".
- Errors state what happened and what to do, without apologising (§10.4).
- Empty states are invitations: "Drop a `.dem` file here, or open one from your match history
  folder" — with the actual folder path for the reader's OS.
- **Nothing in the interface announces its own accessibility, performance or cleverness.** No "fully
  keyboard accessible" badge, no "60 fps" label, no "powered by" line.

---

## 13. Bilingual layout

The interface ships in English and Russian. Design for both from the first component.

- **Russian runs 15–30% longer.** Every layout is designed against the Russian string. If a label
  only fits in `en`, the layout is wrong. This applies to the team cards first: they are floored on
  `min-content` and capped, never fixed.
- No fixed-width labels, no `w-24` on anything containing text.
- Truncation is a last resort and always carries the full text in a tooltip. Never truncate a button
  label — shorten the copy in both locales instead.
- All three faces are self-hosted with `latin`, `latin-ext`, `cyrillic` and `cyrillic-ext` subsets,
  and their Cyrillic rendering is verified in the browser rather than assumed.
- Numbers stay in IBM Plex Mono in both locales; only separators change, via `Intl`.
- Game vocabulary stays in Latin script in the Russian UI (`AK-47`, `Mirage`, `Mid`, `eco`). Mixed
  script lines are normal here and correct — that is how the audience speaks. Do not add visual
  treatment to "fix" it.
- Russian plurals need all four ICU forms (`one` / `few` / `many` / `other`). Two forms is a broken
  `ru`.
- The locale switch is in settings. It is set once and never touched again.

---

## 14. The floor

Non-negotiable, and never announced in the UI:

- **Fully keyboard operable**, per §9.1, including everything the hot corners reveal.
- **Visible focus ring on every interactive element** — 2px `--focus`, never `outline: none`.
- **Body text meets 4.5:1.** `--ink-dim` measures 7.62:1 on `--surface-0` and 7.39:1 on
  `--glass-panel` over it. On glass over plate pixels it fails (2.67:1 at worst), which §2.2
  resolves by ruling `--ink-dim` off those surfaces rather than by thickening the glass.
- **`--ink-faint` never carries text.** 3.63:1 at best.
- **Side identity never relies on hue alone**: which team card the player is in, then hue, then the
  colour-blind palette in settings. §2.7 records that this revision gave up token shape and what it
  owes because of it.
- **Every canvas carries a text equivalent.** The ribbon's round outcomes and economy gaps already
  do; the round timeline needs one and does not have one yet. Vision cones and audibility rings do
  not need one, because they restate a position the feed reports in words.
- **`prefers-reduced-motion` is honoured everywhere**, including by both WebGL backgrounds.
- Responsive down to a laptop screen. The tool is not designed for phones; the landing page is.

---

## 15. What this document asks of the code

Nothing here is built. In dependency order:

1. **`AGENTS.md` amendments** — rule 9 replaced by §8's wording, §16 gains the blurred-review-screen
   frame assertion, §17's summary re-derived from this document, §20's light-theme question closed.
2. **Tokens** — `packages/ui/src/styles/tokens.css` rewritten from §2, §3 and §4; `--kill` deleted;
   two control heights made real in `@disa/ui`; `bindPlayingFlag` and the `data-playing` reset
   removed.
3. **Schema 4** — the four per-sample columns in §5.3, in `crates/demo-parser`, `packages/demo-core`
   and the golden snapshot.
4. **The store catalog** — §10.2's metadata, and the library screen that reads it.
5. **The review layout** — §5, replacing `features/review`'s three-row grid; the round timeline and
   the ribbon re-scale in `features/timeline`. 6. **The plate** — §6's token, utility and world
   states in `features/radar`. The per-frame rules live in `packages/demo-core` and are unit-tested
   there rather than eyeballed on a plate (#112).
7. **Input** — §9's bindings in `core/shortcuts`, the held-arrow rate in `core/playback`, the hot
   corners in `features/review`.
8. **The way in** — §10.1–§10.4, the two vendored backgrounds, `ogl` added and lazy-loaded.
9. **Settings and help** — §10.5 and §10.6, with the help table generated from the bindings.

Each is its own issue and its own PR, per `CONTRIBUTING.md`. **A PR that implements one of these and
contradicts a rule in this document is wrong in the PR, not in the document** — the document is
changed first, by its own issue, or not at all.
