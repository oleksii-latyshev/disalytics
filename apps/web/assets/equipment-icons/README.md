# Equipment icons

Valve's own armour icons, as Counter-Strike 2 draws them in its buy menu and HUD: `armor` is the
vest alone and `armor_helmet` is the vest with the helmet beside it, which is exactly the two states
a player can be in. They are here for the same reason the weapon outlines next door are — the
product needs Valve's art to say what Valve's game did, and nothing in this repository reaches the
network to get it.

**Source:** [`Juknum/counter-strike-icons`](https://github.com/Juknum/counter-strike-icons),
`cs2/panorama/images/icons/equipment/{armor,armor_helmet}.svg`, extracted from the game depot on a
schedule — the same directory the weapon icons come from.

**Why these are their own set.** A weapon icon's id is Counter-Strike's *internal* weapon vocabulary,
which is the vocabulary `Kill.weapon` already carries, so `WEAPON_ICON_IDS` in `@disa/demo-core` can
hold that table to its word. Armour is not in any demo vocabulary — it is `TickTrack.armour` and the
`FLAG_HELMET` bit, read together — so its two ids belong to the interface that draws them and live in
`core/glyphs` rather than in `demo-core`, which hard rule 11 keeps platform-agnostic.

**`armor_helmet` is one icon and not two.** Valve draws the pair side by side in a 48.75-wide box
against the vest's own 26, and the set is drawn to one height with the width following, so the wider
box is the wider mark rather than a scaling problem.

**Changing them:** replace an asset and run `bun run icons:generate`, which rewrites both generated
tables. The generator is deterministic and offline — running it twice must leave the tree untouched.

Counter-Strike 2 and this art are the property of **Valve Corporation**. disalytics is an unofficial
tool, not affiliated with or endorsed by Valve.
