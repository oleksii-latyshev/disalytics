# Equipment icons

Valve's own armour and utility icons, as Counter-Strike 2 draws them in its buy menu and HUD:
`armor` is the vest alone and `armor_helmet` is the vest with the helmet beside it, which is exactly
the two states a player can be in, and the six beside them are what a player can be holding. They
are here for the same reason the weapon outlines next door are — the product needs Valve's art to
say what Valve's game did, and nothing in this repository reaches the network to get it.

**Source:** [`Juknum/counter-strike-icons`](https://github.com/Juknum/counter-strike-icons),
`cs2/panorama/images/icons/equipment/*.svg`, extracted from the game depot on a schedule — the same
directory the weapon icons come from.

**`flashbang.svg` is upstream's `flashbang_assist`, turned upright, and it is the only place in this
repository where Valve's art is altered.** Upstream has two flashbang assets and neither is what the
set needs as it ships. `flashbang.svg` is the *flash* rather than the object — a burst with a hole
through the middle, which at the 12px a team row gives a mark collapses into a smudge, and it is the
one the owner rejected on sight. `flashbang_assist.svg` is the object, cleanly drawn and the
lightest outline in the set at 351 characters, but Valve draws it lying on a diagonal while the
grenade, the canister and the bottle beside it all stand up. So it is rotated −45° about its own
centre by `tools/scripts/icons/rotate.ts` and re-boxed, which moves no point relative to any other:
the outline is Valve's, the orientation is ours, and the set reads as one set. The rotation is
declared as data in `ROTATIONS` in the generator, so it is one line to change and impossible to
apply by accident.

**Why these are their own set.** A weapon icon's id is Counter-Strike's *internal* weapon vocabulary,
which is the vocabulary `Kill.weapon` already carries, so `WEAPON_ICON_IDS` in `@disa/demo-core` can
hold that table to its word. Armour is not in any demo vocabulary — it is `TickTrack.armour` and the
`FLAG_HELMET` bit, read together — so its two ids belong to the interface that draws them and live in
`core/glyphs` rather than in `demo-core`, which hard rule 11 keeps platform-agnostic.

**`armor_helmet` is one icon and not two.** Valve draws the pair side by side in a 48.75-wide box
against the vest's own 26, and the set is drawn to one height with the width following, so the wider
box is the wider mark rather than a scaling problem.

**A utility mark is fitted into a square box rather than drawn to one height**, which is the
opposite of what the weapon set does. Two things depend on it: §7.1's round axis spaces its symbols
on a `GLYPH_PITCH_PX` that *is* one glyph's width, and a team row's run of marks is laid out the same
way. `UtilityGlyph` centres each outline in a square viewBox for that reason, so a wide icon loses
air rather than the layout losing its pitch.

**Changing them:** replace an asset and run `bun run icons:generate`, which rewrites both generated
tables. The generator is deterministic and offline — running it twice must leave the tree untouched.

Counter-Strike 2 and this art are the property of **Valve Corporation**. disalytics is an unofficial
tool, not affiliated with or endorsed by Valve.
