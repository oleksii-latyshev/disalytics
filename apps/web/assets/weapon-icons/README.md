# Weapon icons

Valve's own equipment icons, as Counter-Strike 2 draws them in its killfeed and buy menu. They are
here for the reason the radar images are in `packages/map-data/assets` — the product needs Valve's
art to say what Valve's game did, and nothing in this repository reaches the network to get it.

**Source:** [`Juknum/counter-strike-icons`](https://github.com/Juknum/counter-strike-icons),
`cs2/panorama/images/icons/equipment/*.svg`, extracted from the game depot on a schedule. The file
names are Counter-Strike's *internal* weapon vocabulary — `ak47`, `m4a1_silencer`, `hkp2000` — which
is the vocabulary `Kill.weapon` already carries, so an icon id needs no table of its own.

**What is here:** every weapon a player can hold and be killed by, and nothing else. Utility draws
its own mark (`docs/DESIGN.md` §6.2) and the bomb draws nothing at all (§6.4), so no grenade and no
`c4.svg` is committed. The set is held to `WEAPON_ICON_IDS` in `@disa/demo-core` by the type of the
generated table: an id nobody shipped, or an asset nobody names, fails `bun run typecheck`.

**Changing them:** replace an asset and run `bun run icons:generate`, which rewrites
`apps/web/src/core/glyphs/generated/weapon-icons.ts`. The generator is deterministic and offline —
running it twice must leave the tree untouched — and it requires each asset to be a single `<path>`
in a `0 0 <width> <height>` viewBox, which is what everything upstream extracts already is.

Counter-Strike 2 and this art are the property of **Valve Corporation**. disalytics is an unofficial
tool, not affiliated with or endorsed by Valve.
