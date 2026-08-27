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
| **`ogl` is an approved runtime dependency** | ~10–15 kB gzip against a 500 kB budget currently 20% used. It was approved to buy the two WebGL backgrounds in §10, loaded only by the way-in screens. **Amended 16 August 2026: those two backgrounds are deferred and `ogl` is deliberately unspent.** The way in carries a dimmed radar image from `packages/map-data` instead — material the repository already ships, at no dependency (§10.1). The approval stands so the question is not re-litigated, *not* as a licence: nothing may install `ogl` on the strength of this row alone, because what it was approved to buy is no longer being built. |
| **Rule 9 becomes a budget, not a prohibition** | The global `data-playing` kill switch that zeroes every transition is removed. §8 replaces it with a narrow, enforceable rule and a measurement. |
| **The bottom of the screen is the round, not the match** | A round-scoped timeline is the primary control. The whole-match spine survives beneath it — §7. Nothing built by #90, #91 or #92 is thrown away. **Amended 16 August 2026 (#157):** the strip beneath is a 32px list of rounds, not a 14px re-scaled chart, and #90/#91's economy band and density trace move behind the full-height overlay. The decision held; the form it took did not. **Amended again the same day (#189):** the list moved *above* the controls as 28px of separated pills and the scoreboard came down to meet it as a brow, so the whole vertical middle of the screen now reads match → rounds → round. Third amendment, same decision. |

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
  above, and it is the only case **bar one**: §5.1 grants the scoreboard chip (§5.2) a real
  `backdrop-filter` over the plate, at `--backdrop-hud` — 12px, half the panel's radius. What makes
  it affordable is area rather than repaint rate: the chip is a couple of percent of the plate, so
  the compositor re-blurs a strip rather than a 280px card. It is an exception with a number on it,
  not a precedent — a second surface wanting one is a change to this section. **Since 16 August 2026
  no default layout uses it**: §5.2 moved the scoreboard onto the timeline block, where it is over
  the stage and takes no blur at all, and `--backdrop-hud` is now spent only by readers who choose
  the over-the-plate position.
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
--damage:        #F04248;   /* a hit landing — and nothing else, since §7.1 */
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

**`--damage` has exactly one reader left**: the token's damage flash in §6.1. §7.1's kill glyph
took the side colour of the player who died on 16 August 2026 (#157), and with it the last place
this token stood in for *something bad happened* rather than for damage. That is the token working
as intended — it names one thing and marks one thing — and it is worth stating here, because a
future mark looking for a red will find this line rather than an unclaimed colour.

A semantic colour may only be used for the thing it names. An aggregate is not a semantic: "how much
happened in this minute" is not damage, and is drawn in `--ink-dim`.

#### The colour-blind-safe variant

§2.7 requires one and §10.5 selects it. These are the values, measured rather than picked, and they
landed on 23 August 2026 with the settings table (#202, absorbing #81):

```css
--ct:            #60A6FB;   /* still blue: ΔE2000 1.6 from the default */
--t:             #F9E12A;
--damage:        #D2696E;
--nade-he:       #EAA46A;
--nade-flash:    #F2F6FF;   /* unchanged — white is not a hue anyone confuses */
--nade-smoke:    #979BA2;
--nade-molotov:  #E94814;
--nade-decoy:    #C2BBAD;
--objective:     #A26FAB;
```

**How they were chosen.** Each candidate was run through a dichromat simulation (Viénot, Brettel &
Mollon 1999) for protanopia and deuteranopia — the red-green deficiencies, and between them almost
every colour-blind reader — and the set was picked to maximise the *smallest* CIEDE2000 distance
across every pair of marks, under all of normal, protan and deutan vision at once. Two colours the
palette does not own were held in that comparison because they share the plate: `--ink-faint`, which
is a dead player's token, and the brightest ground a radar image puts behind a mark.

**What that buys.** The defaults collapse under deuteranopia in four places, and two of them are
severe: `--nade-decoy` against `--objective` at **ΔE2000 1.79**, `--nade-smoke` against
`--objective` at **4.19**, `--nade-he` against `--nade-molotov` at **7.53**, and `--damage` against
`--nade-molotov` at **8.60**. The variant holds a floor of **14.28** across all 36 pairs, and the
sides — the pair a reader must never confuse — stand at **65.4** where the defaults reach 67.7.
Every mark keeps at least 2.10:1 against the brightest ground either radar theme draws, which is
the defaults' own floor.

Two pairs are deliberately outside that claim, and neither is a hue failure:

- **`--nade-flash` against `--ink`** measures 3.3 in *normal* vision. Both are white on purpose; a
  flash is told from a line by shape, which is the argument §2.4 already makes about `--kill`.
- **`--ct` against `--accent`** measures **0.9 under deuteranopia** in the default palette and 2.5
  in the variant — the violet accent and CT blue are one colour to a deuteranope, and moving the
  accent is a change to §2.5 rather than to the data colours. It costs the selection ring its violet
  inner edge and nothing else: the ring itself is `--ink`, and §6.1 has it carry the reading.

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

**It shipped on 23 August 2026 (#202).** §2.4 carries the values, the method they were measured by
and the two pairs the claim deliberately excludes.

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
- `44` exists and appears **at most once per screen** — the parse screen's percentage (§10.3).
  Two of them and the effect is gone. It was the review screen's round number until 18 August 2026, when
  §5.2 dropped it as a second reading of §7.3's round strip; a screen with none is what this rule
  permits, and a screen with two is what it forbids.
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
│ ← Open another demo                                        ┌─┬─┬─┐         │
│ de_nuke                                                    │⛶│⚙│?│         │
│                                                            └─┴─┴─┘         │
│                                                                            │
│                                                                            │
│                              ┌───────────┐                 ┌─────────┐     │
│                              │           │                 │ feed    │     │
│ ┌─────────────────┐          │   PLATE   │                 │ a ✧ b   │     │
│ │ T               │          │           │                 └─────────┘     │
│ │ ▸ five rows     │          │           │            ┌─────────────────┐  │
│ │   hp armour $   │          └───────────┘            │ CT              │  │
│ │   weapon nades  │                                   │   five rows     │  │
│ └─────────────────┘                                   │   hp armour $   │  │
│                                                       └─────────────────┘  │
│                         ┌── CT 8 : 5 T │ 1:47 ──┐                          │
│ ┌───────────────────────┴───────────────────────┴──────────────────┐       │
│ │ ⟨1⟩⟨2⟩⟨3⟩⟨4⟩⟨5⟩⟨6⟩⟨7⟩⟨8⟩⟨9⟩⟨10⟩⟨11⟩⟨12⟩ ⋮ ⟨13⟩⟨14⟩⟨15⟩⟨16⟩⟨17⟩   ⌄ │     │
│ │  ▶   ├──💀─────────💣──────💀──┤                            1× ▾ │       │
│ └──────────────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────────────┘
```

There is no top bar, no rails and no inspector column. There is a plate in the middle, three floating
cards and an icon cluster around it, the scoreboard rising from the timeline block as a brow, and one
corner that is type on the stage with nothing behind it. Everything else the previous layout spent
structure on is either on a card or gone.

### 5.1 The plate sizes itself so nothing covers it

This is the load-bearing rule of the whole layout, and §2.3 depends on it.

```
plate = min(
  100cqb - timeline-block - 2 * inset,
  100cqi - 2 * (card-width + gap) - 2 * inset
)
```

The formula is the rule and the numbers below are what it produces, **measured rather than
predicted**. An earlier revision of this section predicted 660px at 1440×900 and 596px at 1280×800,
for a layout whose timeline block had no brow; both are superseded by the table below.

| Viewport | Plate | Which axis binds, and out of what |
|---|---|---|
| 1440×900 | **716** | height — `47 + 12 + 319 + 12 + 326`, the cell spanning rows 1 to 3 |
| 1280×800 | **616** | height — the same three rows at 800 |
| 1100×800 | **516** | width — `1100 - 2 × (280 + 12)`, the two card columns and their gaps |
| 1040×800 | **459** | height — `800 - (59 + 12) - (12 + 122) - (12 + 124)`, below the split |

Every one of them is larger than the 479px the pre-#87 layout produced and larger than the 656px
figure the revision with rails claimed, because a card that floats costs the plate nothing until the
window is narrow.

**A plate figure is a claim with a setup**, and #211 is why that is written down rather than
assumed: the same code was measured at 1040×800 twice and reported 476 and 492; only 476 reproduces,
and neither run recorded the state it was taken in. Below the split the plate is height-bound, so it
takes every vertical pixel on the screen personally — three states named elsewhere in this document
move it, and a run that does not say which one it was in has not measured anything.

| State | 1040×800 | 1440×900 |
|---|---|---|
| default | 459 | 716 |
| the survivor tracks expanded (§7.3) | 443 | 700 |
| a player selected (§5.6) | 378 | 716 |
| the scoreboard over the plate (§5.2) | 491 | 748 |

The locale, the audibility rings and the debug overlay move neither width. A selection costs the
plate nothing **above** the split, where the team card grows inside its own column; below it, that
same growth is 81px off the plate's square. So a measurement of this section states:

- **the five preference keys**, which live in `localStorage` and outlive a reload and a new parse
  alike: `disa.timeline.survivors`, `disa.review.scoreboardOnPlate`, `disa.radar.audibility`,
  `disa.radar.debug`, `disa.locale`. Clear them, and say that you did.
- **whether a player row is selected**, which no key records.
- **the viewport height**, not the width alone. Three of the four widths above are height-bound, so
  quoting "the plate at 1040" without saying 800 is quoting nothing.
- **`devicePixelRatio`, `document.visibilityState` and `document.fonts.status`** — the last two are
  what the in-app browser pane cannot promise, and a font that has not arrived changes the corner's
  line box and therefore row 1.
- **how the demo was opened.** §5.2's corner is row 1's height below the split, and the storage
  notice inside it is a line of type there whenever it speaks — `storing` while the write is in
  flight, `unavailable` for good. One line of it costs the corner 17px and the plate the same, so a
  run that measures during the write reads 17px under the table above and a run that measures after
  it reads the table. Both figures the run behind #211 quoted — 459 during the write, 476 after it —
  are that difference at the strip height of the day, and #218 has since moved the pair.

**The 1040 column is 17px smaller since #218**, and the 1440 column is untouched. A team row's
numbers wrap below the split because no arrangement of them fits a 79px seat — §5.3 — and the
second line is 17px the strip did not spend before. Every state moved by exactly that, which is
what says the wrap and not something else did it; above the split the same row never wraps, so
1440×900 measures 716 either side of the change.

The figures above were measured on `4e1b535`, and the 1040 column again on #218's branch, against
the built bundle in a headed Chrome 151 driven over CDP at `deviceScaleFactor: 2`,
`visibilityState` `visible` and fonts `loaded`, on the 264 MB fixture with every preference key
cleared — at 01:43 of round 1 for the first run and at the freeze of round 7 for the second, which
agree on every figure the wrap does not move. Each width was reached by
`Emulation.setDeviceMetricsOverride` rather than by resizing a window. The plate is
`canvas[role="img"]`; the overlap check is #199's sweep over `document.querySelectorAll('*')`, and
it found nothing over the plate at any of the four widths, with the survivor tracks expanded and
with a player selected alike. The scoreboard over the plate is the one thing that ever is, and it is
this section's own exception.

The plate keeps its aspect ratio and is **never cropped or letterboxed**.

**Nothing overlaps the plate in the default layout.** Revised 16 August 2026: the scoreboard used to
be a permitted exception, sitting as a glass chip on the plate's top edge, and §5.2 moved it onto the
timeline block instead. The exception survives as **what the other scoreboard position spends** — a
reader who prefers the score where CS2 puts its own HUD may put it back, and that preference is the
only thing in the product allowed over the plate. Nothing else may be, in either position; the
`backdrop-filter` budget and the spatial reasoning both depend on it.

That the exception is now optional is worth more than the pixels it returns. The chip over the plate
was the product's **only** `backdrop-filter` over a surface that repaints every frame (§2.3), so the
default layout no longer pays for one at all, and the cost of the preference is confined to the
readers who ask for it.

**Below 1280px** the cards dock to the viewport edges and the plate takes what is left, still
uncovered. **Below 1080px** the two team cards merge into a single strip above the timeline block,
and the blur rule in §2.3 still holds because that strip is not over the plate either. The tool
targets a laptop and up; the phone is the landing page's problem.

### 5.2 The scoreboard, and the top-left corner

A brow on the timeline block, and a corner that is two lines of type on the stage.

**The scoreboard is a brow on the timeline block.** Revised 16 August 2026, on the owner's reading
of the built screen; it was a chip centered over the plate until then. It rises from the centre of
the block's top edge as a tab of that card — square-cornered where the two meet, `--radius-card`
above, **no seam and no hairline across the join**, so it reads as the block growing a lip rather
than as a fifth surface parked on it. It is `--glass-panel` like the block and carries **no
`backdrop-filter`**: it is over the stage, not over the plate, and §2.3 does not pay for a blur that
has nothing moving behind it.

It contains, in one horizontal row:

- the match score, one number per team, coloured by side (`--ct` / `--t`), Plex Mono 20, each with
  its side's two letters immediately beside it at Plex Mono 12 in the same colour
- the round clock — freeze time counts down, live time counts up from `0:00`, post-round holds
  the final time; Plex Mono 20, `tabular-nums`, held off the score by a 1px `--line` rule rather
  than by a gap

**The whole row is one face, and that is the correction of 18 August 2026.** It had three: Roboto
Condensed on the map name and the side letters, Plex Mono on the digits, and the UI face on the
colon between the two numbers, which nothing had ever set a face on. The owner read the built screen
as *«наляписто, такое ощущение, что тут 3 разных шрифта используется»*, and there is no version of
that row where three faces at two ranks inside 32px is anything else. §3's dense-label rule is what
gives way here: a two-letter side tag pressed against a number is part of the number rather than a
label on it, and a row this small has no room to be typeset.

**The side letters take their side's colour** instead of `--ink`, which binds each letter to its own
digit — `CT 9` is one token rather than two adjacent things. That is the exception §2.4 already
makes for the score, extended by two glyphs. They are not decoration: they are what keeps the pair
off hue alone, and they stay for that reason in both positions.

**The type is one rank larger than it shipped at** — 16 → 20 on the score and the clock. The owner's
reading on 16 August was *«смело можно поднять шрифт на 1 ранг, поскольку пока мелковато»*, and a
chip that was sized to stay off a player's head has no such constraint once it is off the plate. The
score is the second-most-read number on the screen after the round clock; at 16 it was the same size
as a player's money.

**The position is a preference** (§10.5), and the brow is the default. The other position is the
chip this section used to describe — centered on the plate's top edge, with the `backdrop-filter`
and §5.1's exception that only it needs. Both readings are legitimate: the top of the screen is
where CS2 and every broadcast put the score, and the bottom is where this product puts everything
else the reader operates. The preference is how that argument stops being one.

The match ID, if the demo carries one, is a line of `--ink-dim` caption text below the row inside
the chip. Most demos do not carry one; the chip does not grow a row for it when it is absent.

**The top-left corner is two lines, and it is not a card.** Rewritten twice on 18 August 2026, and
both revisions took something away:

- **the way out** — a left arrow with its label beside it, `--ink-dim` at rest, `--ink` on hover or
  focus. Its hover padding is pulled back on the left so the arrow starts on the same edge as the
  line under it
- **the map name** — `de_anubis`, not "Anubis"; game vocabulary, never translated, never uppercased
  and never prettified, which is exactly what `.label-dense` would do to it. Roboto Condensed 12,
  `--ink-dim`

**The glass went first.** It was a small `--glass-panel` box holding the round number until that
morning; the way out arriving above it made the corner two glass boxes of different widths stacked
on each other, the owner read that as *«выглядит прям ужасно»*, and the answer was to take the glass
off both rather than to shuffle them. **Type on the stage** is what the corner is — no fill, no
edge, no radius, nothing to line up with anything — and `--surface-0` is what is behind it, because
§5.1 keeps the plate in its own cell and it never reaches here.

**Then the round went.** The corner carried the round number at `44` and the phase under it, and
§7.3's round strip runs the whole match along the bottom of the screen with the playing round lit —
so the number restated the strip in the opposite corner, and the phase restated §7.1's own buy-phase
region beside it. **What is already on screen twice is not a reading, it is noise**, and this corner
keeps only what nothing else says. §3's one `44` per screen is spent on the parse screen now
(§10.3); this screen has none, and that is not a rule broken but a rule with nothing left to
claim it.

Nothing in the corner is a function of the frame any more, which is the second thing the round took
with it: the map name is fixed for the whole match, so the corner stopped re-rendering at the 10 Hz
readout entirely.

**The way out has moved three times since #147 deleted the top bar it started in**: into the corner
cluster, which §5.4 had no seat for it in; to the foot of the settings sheet for one day (#151); and
here. The 17 August argument was that leaving a match is not a setting — which is true, and is the
reason it does not belong *inside* the settings sheet either. **It is a route, and a route is on the
screen**, in the corner where a reader looks for back. It carries its label rather than the arrow
alone, and that is not redundancy: an unlabelled back arrow over a match is the one icon a reader
tests by pressing it, and pressing this one costs them their place.

**The map moved here from the scoreboard** because it is the one thing on that row that never
changes. A brow re-reading a score and a clock every frame had a third reading in it that the reader
had finished with by the first round. The score and the clock stay the scoreboard's.

Below `--breakpoint-wide` the corner carries its own inset, and that is the one thing here the card
used to do for free: the stage has no padding at those widths and everything docks to the viewport
edges, which a card survives on its own padding and bare type does not.

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
| weapon | **new column** | the weapon glyph, `--ink`; game vocabulary, never translated; `C4 Explosive` draws empty, §6.4 |
| grenades | **new column** | up to five 10px glyphs in each utility's own colour |

Four of those six do not exist in `SCHEMA_VERSION` 3 and are the reason for the bump in §0. What the
rails need, for the schema issue to name properly: **armour** per sample (`Uint8`, with helmet as a
new `flags` bit), **current weapon** per sample (`Uint8` index into a per-match weapon table on
`MatchHeader`, 255 for none), **grenades held** per sample (a `Uint8` bitfield — HE, two flash
slots, smoke, fire, decoy, defuse kit fit in one byte), and **money** per sample (`Uint16`). That is
5 bytes on top of the current 20 per player per sample: **+1.9 MB on a 40-minute match at 16 Hz**,
against a 1.5 GB peak budget. The cost is not the memory; the cost is one cache generation.

**Below the split the money takes a line of its own.** A seat in the merged strip is 79px of
content box and the health figure, the helmet and the money are 95px of it at their narrowest —
107px in `ru`, where `9 050 $` is a glyph wider than `$9,050` — so no horizontal arrangement of
them fits and the row wraps rather than overflowing into the seat beside it (#218). It costs the
plate 17px at 1040×800, which §5.1's table carries. Above the split the line is 240px wide and
never wraps.

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

**The cluster was also the bridge for settings that shipped before the sheet did**, and that bridge
closed on 17 August 2026 (#151). It carried the audibility rings from #147, §10.5's scoreboard
position from #196 and the debug overlay from #199 — three named icons grown to seven, which is a
settings menu that has not admitted it — and every one of them is a `--glass-sheet` row now. Leaving
the demo went with them, on the same reasoning and not to the same place: a control may bridge here
only while §10.5's table names it, and leaving a match is not a setting. It spent a day at the foot
of that sheet before §5.2 took it to the top-left corner on 18 August, where a route sits without
either section having to make an exception for it. **The rule survives the bridge it authorised**,
because the next control that ships ahead of its own home will want the same exception.

Beneath the cluster, the **event feed**: the last events before the playhead, newest at the top,
capped at eight rows and clipped to the current round. A row is *attacker · weapon glyph · victim*
with the two names in their side colours, plus a headshot mark, a wallbang mark and a through-smoke
mark where the schema says so. Objective events (plant, defuse) get a full-width row in
`--objective`.

The feed is the one place in the product where **a new item animates in while playback runs**, and
§8 permits it explicitly: it is a discrete, event-triggered arrival at the rate the match produces
kills, not a per-frame tween.

Pressing a feed row seeks to that event. Hovering one draws the kill's line on the plate: a ring in
the attacker's side colour where the shot came from, a filled disc in the victim's where they fell,
and a white line between them at α0.45. White for §6.2's reason for a white trajectory — the line is
the ground the kill crossed rather than the kill itself, and the two ends carry a side. Both ends
are read at the **kill's own frame** and not at the playhead's, because by the time a row can be
hovered both players have moved. Keyboard focus on a row does exactly what hovering it does: §9's
floor is that the screen is operable without a pointer, and a hover-only affordance has no keyboard
at all. An objective row draws nothing, and neither does a kill by the world, which has no second
end. The three marks were drawn in #208 rather than specified here first, and settled by the owner
on 23 August 2026; §10.6's legend (#201) is where they are named to the reader.

### 5.5 The timeline block

A single floating card at the bottom, with a brow and two rows. Top to bottom:

| Part | Height | What |
|---|---|---|
| the brow | 32px, **above** the card's top edge | the scoreboard (§5.2), centered, in its default position |
| the round strip | 28px, or 44px expanded | §7.3's round pills, the card's top row |
| the control row | 64px | **play/pause** (40px, primary), the **round timeline** (§7.1), the **speed control** (§7.2) |

The block is `--glass-panel`, `--radius-float`, and it spans the width between the two team cards'
outer edges. **Total height is 92px, or 108px with the survivors expanded** — 96px until 16 August
2026, and the strip moving above the control row is what returned the 4px. The previous layout spent
205px on the same job.

**The strip is the top row now, not the bottom one.** It was flush to the card's bottom edge from
#157 until this revision, which put it as far from the axis it seeks against as the card allowed;
§7.3 records the rest of the reasoning. The control row is unchanged at 64px — a 40px button plus
12px of padding either side — and still has no slack, so the next thing that wants height here comes
out of the plate and §5.1 has to be re-measured for it. The expanded strip is exactly that case, and
it is the reader's own doing rather than a default.

The brow's 32px sit in the stage above the block, so the block and its brow are 124px of the
viewport's height against 96px before. **Where that comes from depends on which axis binds the
plate**: `min(100cqi, 100cqb)` takes it out of a height-bound plate and off the letterbox of a
width-bound one, and at 1440×900 the plate is height-bound (744×744 before the brow, #147; 716×716
after it). §5.1 carries the measured figure at every width it names.

**The expanded strip costs the plate 16px** — 459 → 443 at 1040×800 and 716 → 700 at 1440×900,
which is the 92px against 108px above arriving intact at both, because the plate is height-bound at
each of those widths and everything this block gains comes out of it. It is the reader's own doing
*and* it is remembered across parses, which is exactly why §5.1's procedure states the preference
key rather than assuming the default.

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
- **Weapon** — a small silhouette **in a 14×7 box** beside the name label, leading it rather than
  trailing it so that ten labels down one side of the plate line their weapons up in a column. Same
  `--ink-dim` and halo treatment as the name: it is part of the label, and it goes when the label
  goes. At plate scale a specific model (AK-47 vs M4A4) is unreadable — the class silhouette is what
  fits, and the team card already names the exact weapon. `C4 Explosive` draws nothing (§6.4). The
  mark reads `TickTrack.weapon` per frame and indexes through `MatchHeader.weapons` for the class.
  **The box is reserved whether or not a mark goes in it**, so a name never twitches sideways as its
  player switches weapon, and which labels collide does not change with what anybody is holding.
  Three things about this bullet were settled by building it (#164) and the reasons are worth
  keeping. **The box is 14×7 and not the 8×8 this section first asked for**: a gun is a wide object,
  and the same set squeezed into a square turns every long gun into the letter T — 14px is where the
  scope on an AWP and the stock on a rifle survive the reduction from §5.3's 24px. **The shapes are
  §5.3's own**, drawn from one table with two renderers rather than a second set drawn by hand,
  because two sets agree on the day they are written and not a week later. And **every piece of
  utility draws one grenade**, where the team row draws the kind: a smoke, a flash and a molotov are
  three marks at 24px and one blur at 14px.
- **Health is not on the plate.** The team card carries it. The only health state the plate shows is
  dead.
- **Walking** — `FLAG_WALKING` takes the token's middle out: a disc of `--surface-0` at 0.35 of the
  token's radius, so a player holding shift reads as hollow. It is a hole rather than a ring because
  **every radius outside the token is already spoken for** — audibility at the radius the player can
  be heard from, selection at +2px, the objective arc at +3.5px — and walking is the thing that
  *suppresses* the audibility ring, so of all the marks on this list those two must not share a
  shape. Drawn after the damage flash rather than under it: a flash repaints the whole token, and a
  player being shot at is still walking.
- **Firing** — a shot draws a 2px `--ink` spur, 4px long, beginning 3px past the tip of the facing
  needle and fading to nothing over **150 ms of match time**. Direction and gunfire in one mark: the
  needle says where the player is looking and the spur says they are shooting down it, which is why
  it is neither a ring — audibility's shape — nor a fill crossover, which is damage's. It reads
  `MatchEvents.shots`, one entry per trigger pull with a gun, binary-searched by tick like every
  other event on this list. Two consequences. It is drawn **from the same angle whether or not the
  needle is**, so a blinded player firing blind still shows where the rounds went. And because it is
  a function of match time, at 0.5× a burst is a stutter of separate marks, at 4× it is one flicker,
  and scrubbing backwards through it plays it again — §8's test.
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
- **Zoom and pan** — scroll wheel anchored on the pointer, a `+`/`−` pair on the plate's
  bottom-right, and **drag to pan, with no modifier**. Zoom is a *view* state, not playback state:
  it survives scrubbing, a round jump, a pause and a re-render, and nothing but the reader moves it.
  Double-click resets, and so does zooming out all the way — at 1× the pan has nowhere to go.
  Corrected 24 August 2026 (#114): this bullet asked for `Cmd`/`Ctrl` + drag and §9.2 asked for a
  plain drag, and §9.2 is the pointer section and the one that wins. Nothing else on the plate reads
  a drag, so the modifier bought nothing and cost the reader a discovery.
- **The range is 1× to 4×**, and 1× is the floor because the plate is already sized to fit the whole
  map (§5.1) — below it there is only margin. The ceiling is a product choice rather than a limit of
  the renderer, and it is worth knowing what it spends: the radar image is 1024px square, so on a
  716px plate the map is at its own resolution around 1.4× and is being enlarged above that. What
  the reader is reading — tokens, needles, names, utility, the kill line — is drawn rather than
  sampled and stays sharp at every level.
- **Zoom is applied in the renderer**, never by scaling a CSS-transformed canvas: the world scales
  and everything measured in device pixels does not, so a hairline is 1px and a name is 10px at 4×
  as at 1×. The token is the one mark that follows the zoom, within the 12–20px §6.1 gives it.
- **A name is drawn beside its token or not at all.** A label whose player the zoom has left off the
  plate is dropped rather than clamped to the nearest edge — clamping is what grows a row of names
  along the edge of a panned plate.
- The debug overlay is a development affordance and lives behind the settings sheet, never on the
  stage.

### 6.4 The bomb — the data is partly there, and the interface still says nothing

The earlier revisions of this section argued from "the demo does not carry it". `SCHEMA_VERSION` 4
(#136) established that it partly does, and the rule survives the correction because the rule was
never really about the data.

What exists: upstream's active-weapon prop reports **`C4 Explosive`** for whichever player holds the
bomb at that sample, so from `SCHEMA_VERSION` 4 onward that entry stands in the per-match weapon
table on `MatchHeader` and the `weapon` column can point at it. What does not exist: anything about
a bomb that is **stowed**. A T with the bomb in their inventory and a rifle in their hands reads as
the rifle, and no `FLAG_`, pickup or drop event fills that gap — `BombPlant` records `siteEntityId`
without a position. So the demo answers "who is holding it right now" and never "who has it".

That makes a carrier indicator worse than absent: it would be right while a T is switched to the
bomb and silently wrong the rest of the round, which is the reading a review tool must not
manufacture. And a tool that reveals the carrier changes how the round is read — the reader stops
reconstructing the round and starts following an arrow. That is a product decision, and it does not
turn back into an open question when a column arrives.

**The rule is a rendering rule, not an absence of data.** No team-card row, plate token, glyph,
tooltip or accessible label renders the `C4 Explosive` entry. A sample whose `weapon` points at it
draws an **empty** weapon glyph — not a distinct mark, not a placeholder that reads as "something
is being withheld". The entry stays in the schema (#136 settled that: hiding it there would cost a
cache generation for a rendering rule), and §5.3's rows are where the rule is enforced.

---

## 7. Time

### 7.1 The round timeline — the primary control

The strip between play/pause and the speed control shows **one round**, from `startTick` to
`endTick`, and nothing else.

- **The buy phase is a distinct region** — `startTick` to `freezeTimeEndTick`, drawn at
  `--surface-2` with a hairline at its end. When auto-skip is on (§10.5) the region is drawn hatched
  and the playhead jumps it.
- **Events are glyphs on the axis, not ticks**: a skull for a kill, a bomb for the plant and a
  cutter for the defuse in `--objective`, a small utility glyph per grenade in its own colour.
  Below a threshold density the glyphs collapse to marks; the round is 1:55 and this is the one
  timeline in the product with room for symbols.
- **The skull is tinted by the side of the player who died** — `--ct` or `--t`, keyed on the
  victim's side *in that round* and never on `PlayerInfo.team`, which is read at the end of the
  match and is wrong for half of them. The question a reader asks of a round axis is not *was there
  a kill* but *did we lose someone*, and §2.4 permits a side colour on a side fact. This is also
  what takes `--damage` off the axis: a kill is still told from damage by shape, which is §2.4's
  rule, and shape is now doing all of that work instead of sharing it with a hue.
- **Kills by the selected player rise; everything else drops to `--ink-faint`.** This is where the
  "loud" the previous revision promised the spine actually belongs, and it only happens in answer to
  a question.
- **The playhead is 1px pure white** with a 2px `--accent` glow beneath it, and it moves with
  `transform` only. The scrubber underneath stays an **uncontrolled** range input — React never owns
  its value (#83).
- Hovering the axis shows a time readout and the frame under the cursor; pressing seeks.
- **Hovering a kill glyph names the kill**: attacker, weapon glyph, victim — the two names in
  their side colours — plus the headshot, wallbang and through-smoke marks, which is `Kill`'s
  `isHeadshot`, `isWallbang` and `isThroughSmoke` and the same row the feed draws (§5.4). A `null`
  attacker is the world, and the row reads as a death rather than as a kill by nobody. The other
  four marks the schema carries — `isNoScope`, `isAttackerBlind`, `isVictimBlind`, `distanceUnits`
  — stay off it: they are the stats view's material, not a hover's.
- That tooltip is permitted **because the feed exists**, not on its own merits — §9.2 forbids a
  tooltip that is the only route to a fact, and the feed is what makes this one a shortcut. It is a
  build order as much as a rule: the kill tooltip may not ship before §5.4's feed does.

### 7.2 The speed control

A pill on the right of the block reading the current rate in Plex Mono. Pressing it opens a
`--glass-raised` menu of `0.25× · 0.5× · 1× · 2× · 4×`; scrolling on it steps through them. The
active entry is `--accent`. The pill also shows a `⏵⏵` mark while a held arrow key is
fast-forwarding (§9.1), so a temporary rate never looks like a setting the reader changed.

### 7.3 The round strip

28px, the timeline block's **top row**, spanning its full width. **One pill per round, all pills the
same width** — a list, not a chart. Equal-width cells were decided 16 August 2026 (#157), replacing
the 14px match ribbon; the pills, the position and everything below are the revision of the same
day, on the owner's reading of the built strip.

The ribbon was a chart of the match: bands proportional to round duration, an economy gap and an
event-density trace. The owner's reading of it was *«снизу у нас непонятные графики»* — a density
trace at 14px is terrain with no legend, and the economy gap answers a question nobody asks while
scrubbing. What the strip was actually being used for was **getting to a round**, and that is what
it is. The ribbon's bands were a map of match time, so a 13-second round was a sliver nobody could
hit; a list gives every round the same target and the same weight, which is what a reader wants when
a round is a *thing* rather than an interval. Nothing on this strip is a playhead — the playhead is
on §7.1, where it belongs.

**What the second reading found.** *«Из-за отсутствия гэпа между ними это уже сложно
воспринимается, так же ещё и информация сколько кого выжило мне кажется всё же лишняя на постоянной
основе.»* Both halves of that are the same failure: the strip was carrying five marks per round —
a tint, a number, two counts and two side letters — with nothing but a hairline between them, so
thirty rounds arrived as a hundred and fifty objects with no hierarchy. What the reader is doing at
this strip is aiming at a number.

A pill carries, by default:

- **The round number** — Plex Mono 13, `--ink`, centred, and the only text in the pill.
  Rounds ahead of the playhead take `--ink-dim`: the match is knowable, and the part that has been
  watched is what the reader is navigating within.
- **A 2px winner bar** on the pill's bottom edge, `--ct` / `--t` from `Round.winner`, full pill
  width. **There is no tint** — a fill spends the whole cell on one bit, and thirty filled cells
  read as a barcode rather than as thirty targets.
- **`--radius-chip` corners, a 4px gap either side, and no hairlines.** Space is the separation.
  This is the change that answers the reading: the pill has to be an object before its contents can
  have an order.
- **The current round** drops the winner bar for a fill of `--ink` α0.10 and a 1px `--glass-edge`
  ring, and takes its number to weight 500. That reads as *here* rather than as a brighter outcome,
  which is what a tinted highlight always ends up meaning.

**The match's own structure divides the strip.** Halves and overtimes are separated by a 12px gap
with a 1px dotted `--line` rule in it. **The boundaries are derived, never assumed**: a divider goes
wherever the slots' sides flip against the previous round, which is `Round.economy[].team` and
therefore a fact of the demo — MR12, MR15, a 6-round overtime and a match that ends early all
produce the right answer from the same rule, and no round count is hardcoded anywhere. A reader who
wants round 14 in the second half does not count to fourteen; they cross the divider and count to
two.

**Survivors are behind a disclosure.** A 32px icon button at the strip's end expands every pill at
once — §4's dense control height, and there is no third one to mint for a 28px row. Its hit area
overruns the strip by 2px either side and lands in the block's own padding, which is the right way
round: a target that is larger than its mark is a target, and one that is smaller is a miss.

Expanded, the strip goes to 44px and each pill gains a 16px block under its number holding two
5-segment tracks — **CT above, T below**, live segments in the side colour, lost ones at
`--ink-faint` α0.20 rather than a half-strength grey, because at 0.40 the two tracks read as a
dotted texture and the live seats have to be picked out of it. Each track spans the pill's inner
width, so the segments scale with the pill instead of being fixed, and the block carries 6px of
padding beneath it — without that the T track sits straight on the winner bar and the two colours
read as one mark.

**CT fills from the right and T fills from the left**, which is §5.3's card positions, so the side
survives as fill direction as well as hue. No digits and no letters in the expanded state — the
question *how did it end* is answered by shape at a glance, and the exact pair is a hover away.

The state is a UI preference and is remembered (§10.5, hard rule 5). It is **off by default**, which
is the owner's reading applied: what is always on screen is the way to a round, and the shape of the
round is what the reader asks for.

**What the survivor tracks count.** Side membership is `Round.economy[].team` — the side the slot
held *that* round (#90), never `PlayerInfo.team`. Deaths are the `kills` whose `tick` falls in
`[startTick, endTick]`, taken off whichever side the victim sat on; the window closes at `endTick`
on purpose, or the post-round kills that follow most rounds would count. A slot with `team: null`
carried no sample at freeze-time end and is not on either side, so a four-man side reads a maximum
of four — that is the correct answer, not an off-by-one. No schema change: `Round` and `Kill` carry
all of it, and `SCHEMA_VERSION` stays 4.

**Side identity without the letters.** `CT` and `T` used to sit under their own digits in the side
colour, because §14's floor says side identity never relies on hue alone and the cell's tint was
already spending that pair of hues on *who won*. Removing both the counts and the tint is what
retires that argument rather than losing it: the winner bar is now the **only** use of the side
pair in the pill, the expanded tracks carry fill direction as their second channel, and **the pill's
accessible name is unchanged** — number, winner, `Round.reason` in words, both survivor counts and
the score the round left behind, all without a pointer. The floor is met by the name, which is where
it was always actually met; the letters were meeting it twice.

**Pressing a pill seeks to that round's `freezeTimeEndTick`.** Hovering one names the round: its
number, the score after it, and `Round.reason` in words, plus both survivor counts while the strip
is collapsed. That is §9.2-legal for the same reason §7.1's kill tooltip is — the pill already says
all of it without a pointer.

**Degradation is one threshold now, not three.** Below **20px** of pill width the number goes and
the winner bar carries the pill alone — bands again, and honestly so. That is the whole ladder: the
counts used to be the first thing a narrow strip dropped, and they are no longer in the default
state to drop.

**20px is the row's own arithmetic, not a guess.** Plex Mono advances 0.6em and §3 gives 13 no
tracking, so a two-digit round number is 15.6px; 2px of padding either side puts the pill at 19.6px,
and the 4px grid rounds it to 20.

The margin is wider than the three-row ladder ever had. The pill row is the block less its 16px
padding either side and the 40px the disclosure takes with its gap, and these are **measured** —
against a replica of §5's grid that reproduces #147's 744×744 at 1440×900 exactly, so the arithmetic
below is the layout's rather than a prediction of it:

| Viewport | Pill row | 24 rounds, one divider | 40 rounds, three dividers |
|---|---|---|---|
| 1440×900 | 1320px | **50.8px** | **28.5px** |
| 1280×800 | 1160px | 44.2px | 24.5px |
| 1100×800 | 1028px | **38.7px** | **21.2px** |
| 1040×800 | 968px | 36.2px | 19.7px |

Only the last cell of that table is under 20px. **A 40-round overtime on a sub-1080 laptop is the
one case that loses the number**, and everything a match without overtime plays is comfortably clear
of the threshold on every width the tool targets. The floor still gets implemented anyway — a rule
with no test case is a rule that rots.

**Why the strip moved to the top of the block.** It was flush to the card's bottom edge from #157
until this revision. The reader's path is *pick a round → watch it on the axis*, and the strip was
on the far side of the controls from the axis it feeds; putting it directly above §7.1 makes that
path two adjacent rows. It also puts the scoreboard brow (§5.2), the round strip and the round axis
on one vertical line through the middle of the screen — the match, its rounds and the round, in that
order, top to bottom.

**The overlay keeps the chart**, and it is built (#207). `M` opens it, and `M` is the whole way in:
the round number in the top-left corner used to as well, and §5.2 removed that number on 18 August
2026 as a second reading of the round strip below. It raises the match full-height over the stage —
the kill marks, the round outcomes, **the density trace and the economy gap**, all at readable size
and, unlike the ribbon, **with a legend**.
Everything #90, #91 and #92 built survives there; none of it is deleted. The reading that condemned
them was about a 14px strip that is always on screen with nothing to explain it, and none of that is
true of a full-height view the reader opened on purpose and is not scrubbing while reading. The
density trace stays `--ink-dim` α0.30 in the overlay: it is an aggregate, and §2.4 forbids
spending a semantic colour on one wherever it is drawn.

**The three readings sit in bands of their own** — kills across the top, the density trace in the
middle, the economy gap along the bottom — over round columns that run the chart's full height, so a
spike, a kill and a buy in the same column are visibly the same round. That separation is what the
height buys: the layers were never what made the ribbon unreadable, and superimposing four series on
14px was. A kill takes the colour of the side that **lost** the player, which is §7.1's rule for a
kill at the scale of a whole match, and a kill no round covers keeps its place and loses its side.

**It pauses playback, and that is what earns the plate.** §5.1 lets a surface cover the plate only
when the plate is not the thing being read, and a match still running behind a chart is a plate
still being read; §10.5's sheets stop playback for the same reason. It also settles `AGENTS.md` §16
by construction rather than by argument — the rAF loop runs only while the clock does, so nothing
repaints underneath. **Nothing on the overlay is a playhead and nothing on it seeks**: the playhead
is §7.1's and the way to a round is the strip's, and the only mark here that knows where the reader
is, is the 1px frame around the current round. Every round keeps its winner tint, the current one
included — dropping the tint is the strip's device for cells that touch, and on a chart this tall
the seconds between rounds are already bare ground, so an untinted round reads as one of those
gaps rather than as *here*.

**A modal makes the strip behind it inert**, so the reading §7.3 keeps on the pills cannot be
borrowed from there while the overlay is up: the overlay carries its own `sr-only` enumeration of
the round outcomes beside `EconomyGaps`. That is not the second enumeration #184 removed — it is
#92's obligation following the canvas, which is exactly what that paragraph says happens. The
density trace stays unvoiced there too; it is an aggregate, and there is no sentence in it.

**`RoundOutcomes` and `EconomyGaps` stay, and one of them moves.** `role="img"` announces that a
picture exists and nothing about what it shows, so the `sr-only` lists are what make any of this
readable without eyes (#92) — and that obligation transfers to whatever replaces the canvas rather
than lapsing with it. `RoundOutcomes` **is** the round strip rather than a second enumeration beside
it (#184) — a pill is an element, so each one carries the whole reading as its accessible name,
both survivor counts included, and that name does not change when the strip is collapsed. It is what
holds §14's floor once the side letters leave the pill. `EconomyGaps` follows the economy gap into
the overlay and is voiced there. Neither is deleted.

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
3. **Inside the radar and timeline canvases there are no tweens.** Things that change there — the
   damage flash, the smoke depleting, the defuse arc — are functions of `clock.frame`, computed in
   the draw the frame was already going to do. **The test is which clock it reads: match time is
   drawing, wall time is animating.**
4. **Animations are discrete and event-triggered.** A hover, a focus, a selection, a card opening, a
   feed row arriving. Nothing loops, nothing breathes, nothing animates because time passed. The
   review screen has no ambient motion at all, and since 16 August 2026 neither does the way in: the
   two WebGL backgrounds that were the one exception here are deferred (§10.1), and what replaced
   them is a still image that changes opacity when a file is over the window.
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

`prefers-reduced-motion: reduce` collapses every duration except opacity fades and is implemented
once in `packages/ui/src/styles/motion.css`. It used to have a second job — holding both WebGL
backgrounds on a static frame — and §10.1 removed the thing rather than the exemption.

### The one orchestrated moment

When a parse completes, the interface assembles rather than appearing: the plate fades up, the four
cards arrive from their own corners over ~400 ms, the round strip fills left to right as data lands,
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
| **hold** `←` `→` | fast-forward or rewind at the configured rate while held; releasing restores the previous one |
| `,` `.` | step one frame back / forward |
| `[` `]` | previous / next round |
| `1`–`5` | select the T player in that row |
| `6`–`0` | select the CT player in that row |
| `Esc` | clear selection; close the topmost sheet, overlay or menu |
| `F` | fullscreen |
| `M` | raise the match overlay |
| `+` `−` | zoom the plate in and out; all the way out is also how it is put back |
| `?` | help |

A held arrow is a **rate change, not a repeat**: `keydown` raises the rate to the one §10.5
carries — 2× by default — in the seek direction, and `keyup` restores it, so the reader scrubs
continuously rather than in steps. What separates a tap from a hold is the keyboard's own repeat:
the first press seeks by the step, and the repeat that follows it is the hardware saying the key is
being held. The transport is the only thing that knows about this — it is a rate beside the speed
rather than written over it — and the speed pill reflects it (§7.2) and does not own it. `keyup` is
also bound on `blur` and `visibilitychange`, or a key released outside the window leaves the match
running fast forever. The buy-phase rule (§10.5) stands aside while an arrow is held, for the same
reason it stands aside for a seek.

Every binding lives in `core/shortcuts`, appears in the help sheet generated from the same table,
and none of them fires while focus is in a text field — or on a control that reads the same key
itself. The round timeline's scrubber walks its own value with `←` `→`, and a roving-focus group
walks itself with them; a group says so by calling `preventDefault`, and a press that has already
been handled never reaches a binding.

**`0` is the last CT seat and nothing else.** It was claimed twice — by that seat and by the zoom
reset — which is why #114 shipped §6.3's zoom without touching the keyboard at all, and #226
settled it against the zoom. The row-number keys are a contiguous range and cannot give up their
last member, and the zoom loses nothing by it: `−` held down reaches 1×, and at 1× the pan is
pinned, so **the floor of the zoom is the reset**. The double-click in §9.2 is still the direct
route to it. `=` fires the zoom in as well as `+`, because it is the same keycap unshifted.

### 9.2 Pointer

- The plate: wheel zooms, drag pans, double-click resets, hovering a token shows the player's name
  and the pointer's own world coordinate when the debug overlay is on.
- Feed rows and round-list cells seek. Team rows select.
- Every hoverable element answers in `--motion-micro`, including during playback.
- Tooltips are `--glass-raised`, appear after 400 ms, and never carry information that exists
  nowhere else. Restated 16 August 2026 (#157), because the rule was being read as *a tooltip may
  not be informative*: what it forbids is a fact reachable **only** by hovering. A tooltip that
  shortens the route to something already on screen is fine, and §7.1's kill tooltip — attacker,
  weapon, victim — is exactly that, since the feed (§5.4) is drawing the same row. The test is a
  build order, not a judgement call: **if the thing it restates is not on screen yet, the tooltip is
  not permitted yet.**

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

### 10.1 The shell

The way in is not one screen. It is a **shell with a persistent sidebar** and one view inside it,
settled with the owner on 16 August 2026 against two alternatives: a shell shared with the review
screen, and a collapsed icon rail there. Both lost to the same fact.

**The sidebar is absent from the review screen, and §5.1 is the reason.** The plate is sized from
the viewport — `min(100cqi, 100cqb)` of the cell the grid leaves it — so a rail is not chrome beside
the plate, it is a subtraction from the plate's own axis. At 1280 the plate measures 616px (#197's
measurement); 280px of rail is nearly half of it, and an icon rail is the same argument at a smaller
number. So the shell ends where the match begins: opening a demo replaces it entirely, and the
corner cluster's close (§5.4) is the way back.

The rail is **17.5rem wide** — the same column the team cards take, so the product has one measure
rather than two — `--glass-panel` at `--blur-panel` over the backdrop below, which §2.3 permits
because the ground behind it is a static image and a blur over static ground is paid for once.

| Part | What |
|---|---|
| head | the product name, and the tagline beneath it above `--breakpoint-wide` |
| body | **Upload** and **Library**, then **Utility lineups** and **Player stats** |
| foot | settings and help — the same two sheets §10.5 and §10.6 describe, so the way in owns no copy of either |

Entries are 40px, §4's larger control height. The current one carries a `--selected` fill and
`--ink`; the rest sit at `--ink-dim`. **Two of the four are honest about being unfinished**: utility
lineups and player stats carry a "soon" chip, are focusable, and pressing one says what it will do
and nothing else. The navigation shape exists now so that adding those screens later is not a
redesign. This section asked for `--ink-faint` on those two labels until they were built; §14 rules
that ink off text at 3.63:1 and the floor wins, so **the chip is what tells an unfinished entry
apart and the label stays at `--ink-dim`**.

**Below `--breakpoint-split` the rail becomes a row** of the same entries above the content: 280px
of rail against a 1024px window leaves the library two columns of card, which is a worse trade than
moving the nav. §14 keeps the landing as the one screen the product owes a phone, so at phone width
the row stays, the card fills the width, and §10.2's grid becomes a single column. Nothing else
about the shell changes shape.

#### The upload view

- **The whole viewport is the drop target**, rail included. A file dragged anywhere is caught and
  the screen acknowledges it. The dashed border goes; a dashed border is the universal signal for
  *placeholder*.
- **One card, centred, with room around it**: what the reader came to do — the action's own
  heading, one line of what to do, the primary action in `--accent`, and beneath it the five most
  recent demos (§10.2) when the device holds any. **The product name is the rail's and not the
  card's**: this section asked for it in both until they were built two hundred pixels apart on one
  screen, and §5.2's lesson from #205 is that what is on screen twice is not a reading. The tagline
  goes with the name.
- Emptiness here is confidence. Feature bullets would be the opposite.

#### The backdrop, and the two backgrounds nobody is building

The previous revision of this section put a full-bleed WebGL **Prism** here and a **Radar** sweep on
§10.3, both from reactbits on `ogl`. **Both are deferred, decided 16 August 2026.** What the way-in
screens carry instead is a **radar image from `packages/map-data`, dimmed**: one fixed map, `cover`
so it bleeds past both axes, lifting from 15% to 30% opacity while a file is over the window, and
still under `prefers-reduced-motion` because opacity on a drag is a response to the reader rather
than an animation of its own.

That is the product's own material instead of an illustration of nothing, it ships in the repository
already, and it costs no dependency. `ogl` stays approved and stays unspent — §0 records why that is
a decision to keep rather than a gap to fill.

### 10.2 The library

A demo that has been opened once opens again instantly — the store reads a cached parse back in
**0.02 s** against 18.6 s to parse it. #140 gave `CatalogEntry` the metadata that makes such a demo
nameable (`fileName`, `map`, `score`, `roundCount`, `storedAt` beside `byteLength` and `lastUsedAt`)
and put five rows on the way-in card. **The library is where all of them live, and it is a grid of
cards rather than a list of rows** — decided 16 August 2026. A row is a filing cabinet; a card can
carry the map, and the map is how a reader recognises a match they downloaded a week ago.

One card carries: the **map thumbnail**, the **score**, the **file name**, the **round count**, the
**size**, and the **date parsed**. Three of those need a rule attached.

- **The thumbnail is the same radar asset the plate draws** (`packages/map-data`, the active theme),
  so the grid adds no image to the build. It is the map and not the match: two demos of Mirage look
  alike here, which is orientation rather than identity, and the file name is what tells them apart.
- **The score is by the side each team started on.** `MatchScore` is `startedCt`/`startedT` because
  `Round.winner` is a side and sides swap at halftime; a card reading `CT 13 – T 11` would be wrong
  for half of every match — #141 is that same bug on the review screen.
- **No team names, and not by omission.** Nothing in `MatchHeader` carries them, so the card does
  not promise them. Putting a team name on a card is a parser change first and a screen change
  second.

**The header states the count, and beside it what the device is holding.** Two figures from two
places, and conflating them is the failure to avoid:

- **the demos' own total is ours** — the sum of `byteLength` in the catalog, exact, and the number
  worth stating against `CACHE_BYTE_LIMIT` (512 MB), because that ceiling is what actually evicts;
- **the device's is the browser's** — `navigator.storage.estimate()`, which reports usage and quota
  for **the whole origin** and which browsers pad deliberately. It is quoted as an estimate, never
  as an exact figure and never as the limit.

If `requestPersistence` came back `best-effort` — the common answer, not the exceptional one — the
library says once that the browser may reclaim the cache. It is a fact about the device, so it is
stated in the interface's voice and never as an error.

What survives from the list this replaces, unchanged:

- **Pressing a card opens the demo from the cache without a file**, which is the whole point of the
  feature. The dialog below is what a press opens.
- Each card has a remove control. Removal is immediate and unconfirmed — it deletes a cache entry,
  not a demo; the reader's `.dem` is untouched on disk and the copy says so.
- An entry whose `SCHEMA_VERSION` no longer matches is **not shown**. It is unreachable by
  definition and the store drops it on open; a card that cannot be opened is worse than no card. The
  same holds for an entry with no metadata (#140) and for one whose file has gone, which a read
  removes.
- The library is **store state, not a preference**: it lives in the catalog and never in
  `localStorage` — hard rule 5.
- The way-in card keeps the five most recent (#140). The library screen holds every one of them,
  and the card's disclosure is **a route to that screen rather than an expansion in place** — once
  the rail has a Library entry, expanding would be the same list in two states one press apart.

#### The demo dialog

Pressing a card opens a dialog, and **its plate is rendered from the cached parse rather than stored
as an image**. That is the decision of 16 August 2026 and the reason the dialog is worth building at
all: the parse is already in the cache and `features/radar` already draws it, so the dialog can show
where the players actually were instead of a screenshot of where they once were.

- **The plate, at one frame.** `freezeTimeEndTick` of the round in question — the buy is over and
  ten players are alive and spread — and it is one frame: the dialog draws and does not start the
  transport, so nothing on this screen runs a clock.
- **The roster by side**, from the round being shown rather than from the end of the match, for the
  reason §6.1's tokens read the round: sides swap.
- **The rounds as a way in.** Pressing one enters the match at that round instead of at the start,
  which is the shortest route the product has from "which demo was that" to a specific moment.

**What it costs, stated plainly.** The dialog needs the whole `ParsedDemo`: the 0.02 s cache read,
and then the demo's entire `TickTrack` resident to draw a single frame. Three consequences, all of
them rules rather than notes:

- it opens on a **press and never on a hover** — a grid that parses on mouseover is a grid that
  thrashes the cache;
- **it releases the parse when it closes** without entering the match, or browsing eight cards holds
  eight matches in memory;
- it is the one route in that can fail after the card has drawn — a cached file that has gone. #140
  drops such an entry on read, so what the reader sees is a card that disappears, not a dialog that
  lies.

A stored thumbnail was the alternative and it loses on three counts: it is a second copy of a truth
the cache already holds, it needs invalidating when the radar theme changes, and it goes stale the
moment `SCHEMA_VERSION` moves. The plate is cheaper to be correct about than an image is.

**The round in question is the first**, and the primary action opens there. This section said "the
round in question" without saying which, and the answer that keeps the dialog one reading rather
than two is the round the match itself opens on: the plate is a picture of the demo, and the row of
rounds beneath it is the way in. A strip that also re-drew the plate would make the dialog a second
review screen — which is the screen one press away.

**The dialog is `@disa/ui`'s `Dialog`, and it is the card itself rather than a card inside a
full-viewport `<dialog>`.** That is what lets light dismiss be the platform's: `closedby="any"` fires
on a press *outside the element*, and an element covering the viewport has no outside. Safari has no
implementation, so the attribute is set behind a feature test and the fallback is the press-outside
listener the feature's own guidance names. Two consequences worth knowing: the ground is
`::backdrop` at §10.5's grade — the card is glass and only the ground behind it is pushed back — and
a caller's `display` utility must be written behind `open:`, because a bare one beats the UA's
`dialog:not([open]) { display: none }` and puts the dialog on screen while it is closed.

### 10.3 The parse screen

The same screen as the upload view, transformed in place. It does not navigate, and the shell around
it does not change either — the rail stays, with Upload still the current entry, because a parse is
something the reader started rather than somewhere they went.

- **The backdrop is §10.1's**, unmoved and undimmed further while the parse runs. The Radar sweep
  this bullet used to name is deferred with Prism (§10.1), and nothing replaces it: a ground that
  reacted to progress would be the progress indicator this section spends its last two bullets
  refusing.
- **Over it, the number**: the percentage at `44` in Plex Mono, and beneath it the stage in the
  reader's words. "Reading the demo", "Following the players", "Collecting the rounds" — never
  "Initializing WASM module".
- **The card fills in as the parser learns**: file name first, then map, then player count.
- **Nothing here is a spinner**, and the hidden-tab explanation belongs on this screen and nowhere
  else — a backgrounded tab parses several times slower and the reader deserves to know that before
  they conclude the product is broken.
- Cancel is always available and says "Cancel parse".

**The progress bar is gone, and the number is the reading.** A 1px accent track sat under the
percentage from #52 until this screen was built to the section above it, and the two stated one
fact twice — which is §5.2's lesson from #205, applied to a screen rather than to a corner. What
that costs is a shape the eye can read without parsing digits, and what it buys is the thing this
section asks for: one number, large, in the only place §3 lets `44` be spent. The `progressbar`
role rides on the percentage itself, so nothing is lost to a screen reader — and because that role
names its element by `aria-label` and never by its content, **the stage line is a sibling of the
number and not a child of it**. Inside, it would be read by nobody.

**The hidden-tab note is earned, and it carries no number.** It appears under the card's facts once
this tab has actually been in the background during *this* parse, and never before — a warning shown
pre-emptively describes a slowdown the reader is not having, and would read as an excuse made in
advance. The multiplier stays out of the copy: `docs/PARSER.md` §16 measured ~5× on one machine
against one fixture, §11 still has no model of slow hardware generally, and a figure on screen is a
promise the product cannot keep. The listener lives with the parse rather than with the app — a tab
in the background costs nothing on any other screen — and it reads `document.hidden` when it
registers as well as on every change, because a tab that was already hidden when the worker started
is just as slow and `visibilitychange` will never fire to say so.

**There are two stages and not three.** The three in the bullet above are the voice rather than the
list: `ParsePhase` is `decompress` and `parse`, because the demo's three passes are upstream's and
are not reported separately. The card's own filling-in is two steps for the same reason — the file
name is known from the drop, and the map and the player count arrive together in one
`MatchHeader`.

### 10.4 The failure screen

Same card, same place. The error states what happened and what to do, in the interface's voice,
without apologising:

> **This is a POV demo.** Only match demos (GOTV) contain data for all ten players.
> Download the match demo from your match history and try again.

**"Same card" is the whole card.** The failure replaces the way in rather than sitting above a copy
of it: a heading saying what went wrong, over a second heading offering to open a demo, is the
screen apologising and then changing the subject. What it keeps is the route out — its own file
picker, and the demos this device already holds — and the whole viewport is still the drop target.

**It carries no `--damage`.** §2 leaves that token exactly one reader, the token's damage flash in
§6.1, and a tinted border here would be it standing in for *something bad happened* — the use that
section rules out by name. The copy is what says an open failed.

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
| Interface | **Scoreboard position** — on the timeline block / over the plate (§5.2) | on the block |
| Interface | **Round strip survivors** — the expanded tracks in §7.3 | off |
| Colour | **Colour-blind-safe palette** — every data colour in §2.4, not only the sides | off |
| Interface | Language — English / Русский | system |
| Interface | Reduce motion | follows the system |
| Developer | Debug overlay — coordinates and frame counters | off |

**Skip the buy phase is a playback rule, not a rendering one**: the transport performs the jump, so
scrubbing into the buy phase by hand still works and still shows it. A setting that made the buy
phase unreachable would be a bug, not a feature.

**The scoreboard position is the one setting that changes what may overlap the plate.** Over the
plate it spends §5.1's exception and §2.3's `--backdrop-hud`; on the block it spends neither. That
is a real cost attached to a real preference, and §5.2 argues why both readings are legitimate.

Every setting is a UI preference and therefore allowed in `localStorage` under hard rule 5. Nothing
parsed goes there.

**The sheet exists since 17 August 2026 (#151)** and carried three of these rows until 23 August —
the audibility rings, the scoreboard position and the debug overlay, which are the three that had
bridged through the corner cluster (§5.4). **The rest of the table landed in #202**, and two of its
rows are worth stating in full, because the table's own wording leaves them open:

- **Seek step and held-arrow rate are read by `features/review`** since #226, and they are the only
  two rows in this table that are not read where they are obeyed: a key binding belongs to the
  screen that holds §9.1's table, not to the transport it moves. They were stored and obeyed by
  nothing for two days, which was a row waiting on a step rather than a row that did nothing.
- **Trajectories narrowed to *selected only* draw nothing until a player is selected.** §6.2 draws a
  path for a grenade in the air and for a grenade the reader has picked out, and the only thing this
  screen lets a reader pick out is a player — so the narrow answer is that player's grenades, and
  with nobody selected there is honestly nothing to draw.

A row that had not been built was never a row that had been decided against: this table is the
specification either way, which is what kept those three in it while they were living somewhere
else.

**Leaving the demo is not here, and was for a day.** It landed at the foot of this sheet on 17
August because the corner cluster had no seat for it once §5.4's bridge closed, and left on 18
August because this table admits settings rather than actions — which is an argument against a
footer as much as against a row. It is in the top-left corner now (§5.2). The sheet has no footer at
all: everything in it is one of these rows.

### 10.6 Help

A `--glass-sheet` sibling of settings, opened by `?` or the corner cluster. Three parts: what the
product does in four sentences, the keyboard table from §9.1 **generated from the same source as the
bindings**, and a legend of every mark on the plate — token states, utility states, the objective
arc. A legend that is written by hand drifts from the renderer within two issues; this one reads the
same tokens the renderer does.

It ended up stronger than that rule asks: a swatch is a canvas drawn by the plate's **own** draw
functions, so a mark's colour, its opacity and its geometry all arrive from the code that draws it
on the plate, and the legend chooses nothing but where in a 56×28 box a mark sits and how far
through its own life it is caught. §5.4's three kill marks are named here too, which is the promise
that section makes, and §6.1's weapon, walking and firing marks joined them with #164 — seventeen
entries rather than fourteen. **The vision wedge is the one §6 mark the legend will not draw**: its
geometry sits inside the token layer around a gradient the layer caches across frames, and lifting
it out for a picture would move a frame path — so the entry for a selected player names the cone in
words instead.

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
- There is nothing to vendor for the way in. The two WebGL backgrounds this bullet used to describe
  are deferred (§10.1) and the backdrop that replaced them is an image `packages/map-data` already
  generates, so no third-party component and no `ogl` chunk enters the build at all.
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
  owes because of it. §7.3's round pill is the case where the second channel is **the element's own
  accessible name** rather than a mark beside the colour — permitted because the name carries the
  whole reading and is reachable without a pointer, not because the pill ran out of room.
- **Every canvas carries a text equivalent.** `RoundOutcomes` and `EconomyGaps` already do it, and
  §7.3 keeps both across the ribbon's replacement rather than letting the obligation lapse with the
  canvas that carried it; the round timeline needs one and does not have one yet. Vision cones and
  audibility rings do not need one, because they restate a position the feed reports in words.
- **`prefers-reduced-motion` is honoured everywhere.** There are no WebGL backgrounds to exempt from
  it any more (§10.1); what the way in animates is an opacity on a drag, which is a response to the
  reader rather than motion of its own.
- Responsive down to a laptop screen. The tool is not designed for phones; the way in is, which is
  what §10.1's rail-becomes-a-row rule exists to serve.

---

## 15. What this document asks of the code

Steps 1–5 are complete (#132, #136, #140, #147, #154), and so is step 11 (#194, #197). §5.4's event
feed was the one thing step 5 left behind: its rows landed in #209 and its hover on the plate in
#208. Step 6 is complete as of #114, step 7 is down to §9.3's hot corners as of #226, and **step 8
is complete as of #236** — the way in is the shell, the grid, the dialog and the two screens a parse
passes through. In dependency order:

1. ~~**`AGENTS.md` amendments**~~ *(done, #132)* — rule 9 replaced by §8's wording, §16 gains the
   blurred-review-screen frame assertion, §17's summary re-derived from this document, §20's
   light-theme question closed.
2. ~~**Tokens**~~ *(done, #132)* — `packages/ui/src/styles/tokens.css` rewritten from §2, §3 and
   §4; `--kill` deleted; two control heights made real in `@disa/ui`; `bindPlayingFlag` and the
   `data-playing` reset removed.
3. ~~**Schema 4**~~ *(done, #136)* — the four per-sample columns in §5.3, in `crates/demo-parser`,
   `packages/demo-core` and the golden snapshot.
4. ~~**The store catalog**~~ *(done, #140)* — §10.2's metadata, and the five rows on the way-in card
   that read it. §10.2 was rewritten by #195 *after* this step closed: the metadata it wrote is
   exactly what a card needs, so what is outstanding is the grid rather than the store, and it is
   step 8's.
5. ~~**The review layout**~~ *(done, #147)* — §5, replacing `features/review`'s three-row grid;
   the round timeline and the ribbon re-scale in `features/timeline`. The team cards are the first
   thing to read the `weapon` column, so §6.4's rendering rule is one of their constraints: the
   `C4 Explosive` entry draws an empty glyph, and it is not rediscovered as an open question
   because the column exists. **One thing §5 asks for did not land with it: §5.4's event feed.**
   It was step 10's blocker as well as its own, and it closed in two halves — the rows in #209 and
   the kill's line on the plate in #208, which is the hover §5.4 names beside the press.
   §5.2 was rewritten by #166 *after* this step closed and caught up in **#171**, which split the
   old top-left card into the scoreboard chip and the round card, gave the clock its three phases,
   and replaced the halftime-swap bug in the score (#141) with `sideScoreAtFrame` attributing by
   team. That PR is also the first caller of §2.3's one blur exception. **§5.2 changed again on 18
   August 2026 (#204)** — the brow gave up the map name and the two faces it never needed, the way
   out of a match left the settings sheet for the top-left corner, and that corner stopped being a
   card and then stopped carrying the round: the way out and the map name are two lines of type on
   the stage, and §7.3's strip is the only place the round is stated.
6. ~~**The plate**~~ *(done, #154, #168, #175, #114, #164)* — §6's token, utility and world states
   in `features/radar`. The per-frame rules live in `packages/demo-core` and are unit-tested there
   rather than eyeballed on a plate (#112). §6.1's token states landed in #154, §6.2's utility in
   #168 and #175, and §6.3's zoom and pan in #114. **The weapon, the walk and the gunfire landed in
   #164**, which is also where §6.1 finally got the walk and the fire written down: #162 asked for
   three marks and #166 wrote one, so the two decisions that section says must be settled before a
   PR were settled in that PR's own first hour instead of in a document ahead of it. The pattern to
   copy is still #190/#193's — but the gap to look for is this one: an issue closed by a commit that
   did *part* of it. The zoom is the one part of §6 whose rules did
   **not** go to `demo-core`: it is plate geometry and knows about the radar image, so it is
   `features/radar/helpers/view.ts` and unit-tested there. Its keyboard half is step 7's, for the
   reason §9.1 now records.
7. **Input** — §9's bindings in `core/shortcuts`, the held-arrow rate in `core/playback`, the hot
   corners in `features/review`. **The keyboard half landed in #226**: §9.1's table is bound in
   full, the held arrow is a rate the transport owns rather than a stream of seeks, and `0` is the
   last CT seat — the collision §9.1 recorded is settled there and in this document at once. The
   zoom's two keys are bound in `features/radar`, because the view they move is a box that lives
   there and reaching it from the stage would be a second source of truth for it. **§9.3's hot
   corners are what is left of this step**; they are a pointer feature with no keyboard in them and
   nothing waits on them.
8. **The way in** *(rewritten by #195)* — §10.1–§10.4 as this document now describes them, in
   `apps/web/src/features/library`. **No `ogl` and no vendored backgrounds**: the two WebGL screens
   are deferred and the dimmed radar backdrop already ships, so this step adds no dependency at all.
   Four pieces, in dependency order, and they are not one PR:
   - ~~**the shell**~~ *(done, #237)* — §10.1's rail, its four entries, the row it becomes below
     `--breakpoint-split`, and the upload view moving inside it. It ends where the review screen
     begins, which is a routing rule as much as a layout one. Two of §10.1's own sentences did not
     survive being drawn: `--ink-faint` on the unfinished entries loses to §14's floor, and the
     product name on the upload card loses to the rail's head two hundred pixels away. Both were
     corrected in that PR rather than ahead of it — the decision needing a document first is one
     that has to be *made*, and looking at the screen made these two;
   - ~~**the library grid**~~ *(done, #240)* — §10.2's cards replacing the rows on the way-in card,
     with the count, the catalog's own byte total against `CACHE_BYTE_LIMIT`, and
     `navigator.storage.estimate()` beside it as an estimate. The `best-effort` line comes from
     `requestPersistence`, which existed already; `storageEstimate()` joined it in
     `packages/demo-store` so that `navigator.storage` stays behind one door;
   - ~~**the demo dialog**~~ *(done, #235)* — §10.2's dialog, drawing one frame through
     `features/radar` from the cached parse. It is the first thing outside the review screen to
     mount the renderer, and releasing it on close was measured rather than asserted: with forced
     GC the heap reads 35 MB, 89 MB with the dialog open and 35 MB again once it closes, three
     cycles identical. `PlateStill` is what draws it — the map and the players and nothing else,
     because the buy ending is the moment every question the utility and kill-line layers answer
     has an empty answer — and the round the reader picks reaches the match as `ParseState.ready`'s
     own `roundIndex` rather than as a seek after the fact;
   - ~~**the parse and failure screens**~~ *(done, #236)* — §10.3 and §10.4 inside the shell. Two
     of those sections' own sentences did not survive being built, and both are corrected in them
     rather than here: the progress bar loses to the number beside it, and the failure is the whole
     card rather than a box above the way in. **#68's hidden-tab explanation is still unbuilt** —
     this step gave it the screen it belongs on and nothing more, because it is its own issue and a
     PR closes one.

   None of it changes `SCHEMA_VERSION`, and none of it touches §5, §6 or §7: the review screen is
   not in the shell.
9. **Settings and help** *(opened by #151)* — §10.5 and §10.6. Both sheets exist: `@disa/ui` has the
   native `<dialog>` they are built on, settings carries the three rows that had bridged through the
   corner cluster, and help carries §10.6's four sentences plus the keyboard table **generated from
   `core/shortcuts`' own bindings** rather than written beside them. **§10.6's legend landed in
   #220**, and it went past the rule it was given: a swatch is drawn by the plate's own draw
   function, so a mark cannot drift from the renderer without the renderer changing shape. **The
   rest of §10.5's table landed in #202**, which brought #81's colour-blind palette in with it
   rather than leaving one row of the table pointing at an issue of its own. The step is complete.
10. **Time** *(added by #157)* — §7 as rewritten on 16 August 2026, in `features/timeline`. Three
    pieces, and they are not one PR: §7.1's kill glyph takes the victim's side colour; §7.1's kill
    tooltip, **which may not ship before step 5's event feed**, because §9.2 permits it only as a
    shortcut to something already on screen; and §7.3's round list replacing `MatchRibbon`, with
    `EconomyGaps`, the economy band and the density trace moving into the full-height overlay
    rather than being deleted. `RoundOutcomes` **is** the round list rather than a list beside it.
    No schema change — `Round.economy[].team` and `kills` carry the survivor counts already, and
    `SCHEMA_VERSION` stays 4. §7.1's glyph and §7.3's list landed in #182 and #184, the kill tooltip
    in #213 once #209's feed unblocked it, and **§7.3's full-height match overlay in #207**, which is
    where #90's economy gap, #91's density trace and #92's `EconomyGaps` went rather than being
    deleted. The step is complete, and §7 has nothing left without code. **§7.3's cell was revised again on 16 August 2026**
    — the round number leads and both sides' counts flank it, with the sides written out — and that
    revision shipped inside #171 at the owner's request rather than as its own issue.
11. **The strip and the brow** *(added by #189)* — §7.3 as rewritten on 16 August 2026 and §5.2's
    scoreboard position, in `features/timeline` and `features/review`. Two pieces and two PRs. The
    strip becomes gapped pills above the control row, the winner moves from a tint to a bottom bar,
    the match's segments are divided by a dotted rule derived from `Round.economy[].team`, and the
    survivor counts go behind an expand toggle as two 5-segment tracks. The scoreboard becomes a brow
    on the timeline block with the over-the-plate chip kept as a preference, its type one rank
    larger. **Both change the block's height, so §5.1's plate geometry is re-measured in each PR**
    rather than asserted from #147's numbers. No schema change; `SCHEMA_VERSION` stays 4. The
    segment boundaries want a helper in `packages/demo-core` beside `roundSurvivors`, unit-tested
    there — a match that never swaps sides and a match with two overtimes are the cases that decide
    it.

Each is its own issue and its own PR, per `CONTRIBUTING.md`. **A PR that implements one of these and
contradicts a rule in this document is wrong in the PR, not in the document** — the document is
changed first, by its own issue, or not at all.
