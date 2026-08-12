//! The per-match weapon table and the grenade bitfield, both built from what a match actually
//! carried rather than from an enumeration of what exists.
//!
//! `docs/DESIGN.md` §5.3 asks the rails for a weapon glyph and up to five utility glyphs per
//! player. Both come from upstream item definition indices, whose display names are the only
//! vocabulary this crate can name without recalling a list it has never read — #53 records why the
//! global enumeration is blocked and this one is not.

use crate::schema::{
    GRENADE_DECOY, GRENADE_DEFUSE_KIT, GRENADE_FIRE, GRENADE_FLASH, GRENADE_FLASH_SECOND,
    GRENADE_HE, GRENADE_SMOKE, WEAPON_NONE,
};
use csgoproto::maps::WEAPINDICIES;
use std::collections::{BTreeMap, BTreeSet};

// Item definition indices, from `vendor/csgoproto/src/maps.rs`. The three low ones are the default
// knives each side spawns with; everything from 500 up is a cosmetic variant of them, and nothing
// that is not a knife lives in that range.
const KNIFE_CT: u32 = 41;
const KNIFE_BARE: u32 = 42;
const KNIFE_T: u32 = 59;
const FIRST_COSMETIC_KNIFE: u32 = 500;
const LAST_COSMETIC_KNIFE: u32 = 526;

/// What every knife collapses to. A skin changes nothing a reviewer can act on, and the events do
/// not agree with each other about them anyway: `player_death` and `weapon_fire` name the variant,
/// `player_hurt` and `item_equip` say `knife`. Twenty table entries for one glyph is the cost of
/// pretending otherwise. Measured on a real demo in #53.
const KNIFE: &str = "Knife";

const FLASHBANG: u32 = 43;
const HE: u32 = 44;
const SMOKE: u32 = 45;
const MOLOTOV: u32 = 46;
const DECOY: u32 = 47;
const INCENDIARY: u32 = 48;
const DEFUSE_KIT: u32 = 55;

const fn is_knife(def_index: u32) -> bool {
    matches!(def_index, KNIFE_CT | KNIFE_BARE | KNIFE_T)
        || (def_index >= FIRST_COSMETIC_KNIFE && def_index <= LAST_COSMETIC_KNIFE)
}

/// True for a display name upstream gives to some knife. The active-weapon prop hands over a name
/// with no index beside it, so the collapse has to be answerable from the name alone.
///
/// This walks all of `WEAPINDICIES`, so it is called once per *distinct* name a match carried —
/// roughly thirty times — and never per sample.
fn is_knife_name(name: &str) -> bool {
    WEAPINDICIES
        .entries()
        .any(|(def_index, weapon)| *weapon == name && is_knife(*def_index))
}

/// The weapons one match used, in the order [`crate::schema::TickTrack::weapon`] indexes them.
///
/// Built in two phases because an index is only meaningful once every name is in: the caller
/// records names on one pass over the table, calls [`Self::seal`], and looks indices up on the
/// next. Insertion order would make the table a function of which player upstream happened to walk
/// first, so the names are sorted and the indices fall out of the sort — hard rule 8.
#[derive(Debug, Default)]
pub(crate) struct WeaponTable {
    /// Every display name the match carried, mapped to the name it collapses to.
    collapsed: BTreeMap<String, String>,
    /// Filled by [`Self::seal`]: a raw display name to its index, so a lookup during the writing
    /// pass costs one comparison-ordered probe and no knife test.
    indices: BTreeMap<String, u8>,
    names: Vec<String>,
}

impl WeaponTable {
    pub(crate) fn record(&mut self, name: &str) {
        if self.collapsed.contains_key(name) {
            return;
        }
        let canonical = if is_knife_name(name) {
            KNIFE.to_owned()
        } else {
            name.to_owned()
        };
        // A table that grew past the sentinel would hand out `WEAPON_NONE` as a real index. No
        // match comes close — a demo carries around thirty — so refusing the overflow costs
        // nothing and removes the way it could go wrong.
        if !self.collapsed.values().any(|seen| *seen == canonical)
            && self.distinct_count() >= usize::from(WEAPON_NONE)
        {
            return;
        }
        self.collapsed.insert(name.to_owned(), canonical);
    }

    fn distinct_count(&self) -> usize {
        self.collapsed.values().collect::<BTreeSet<_>>().len()
    }

    pub(crate) fn seal(&mut self) {
        self.names = self
            .collapsed
            .values()
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        self.indices = self
            .collapsed
            .iter()
            .filter_map(|(raw, canonical)| {
                let index = self.names.iter().position(|name| name == canonical)?;
                Some((raw.clone(), u8::try_from(index).ok()?))
            })
            .collect();
    }

    pub(crate) fn index_of(&self, name: &str) -> u8 {
        self.indices.get(name).copied().unwrap_or(WEAPON_NONE)
    }

    pub(crate) fn into_names(self) -> Vec<String> {
        self.names
    }
}

/// The `GRENADE_*` bitfield for one player's inventory.
///
/// A second flashbang is a second `43` in the list — upstream pushes the index twice rather than
/// carrying a count — so the two flash bits are set by occurrence and not from a separate prop.
pub(crate) fn grenades_of(inventory: &[u32]) -> u8 {
    let mut bits = 0;
    let mut flashbangs = 0;

    for def_index in inventory {
        bits |= match *def_index {
            HE => GRENADE_HE,
            SMOKE => GRENADE_SMOKE,
            MOLOTOV | INCENDIARY => GRENADE_FIRE,
            DECOY => GRENADE_DECOY,
            DEFUSE_KIT => GRENADE_DEFUSE_KIT,
            FLASHBANG => {
                flashbangs += 1;
                if flashbangs > 1 {
                    GRENADE_FLASH_SECOND
                } else {
                    GRENADE_FLASH
                }
            }
            _ => 0,
        };
    }

    bits
}

#[cfg(test)]
mod tests {
    use super::{WeaponTable, grenades_of, is_knife_name};
    use crate::schema::{
        GRENADE_DECOY, GRENADE_DEFUSE_KIT, GRENADE_FIRE, GRENADE_FLASH, GRENADE_FLASH_SECOND,
        GRENADE_HE, GRENADE_SMOKE, WEAPON_NONE,
    };

    fn sealed(names: &[&str]) -> WeaponTable {
        let mut table = WeaponTable::default();
        for name in names {
            table.record(name);
        }
        table.seal();
        table
    }

    /// The active-weapon prop reports the variant's own display name, so the collapse has to
    /// recognise it without an index. These are values read off a real demo in #53.
    #[test]
    fn a_knife_is_recognised_from_its_display_name_alone() {
        for name in [
            "Paracord Knife",
            "M9 Bayonet",
            "Stiletto Knife",
            "Shadow Daggers",
            "Kukri Knife",
            "knife",
            "knife_t",
            "Knife",
        ] {
            assert!(is_knife_name(name), "{name}");
        }
    }

    #[test]
    fn a_weapon_that_is_not_a_knife_is_not_collapsed() {
        for name in ["AK-47", "Zeus x27", "M4A1-S", "Kevlar Vest"] {
            assert!(!is_knife_name(name), "{name}");
        }
    }

    #[test]
    fn the_table_is_sorted_so_the_same_match_always_indexes_the_same_way() {
        let table = sealed(&["AWP", "AK-47", "Stiletto Knife", "M4A1-S"]);

        assert_eq!(table.index_of("AK-47"), 0);
        assert_eq!(table.index_of("AWP"), 1);
        assert_eq!(table.index_of("Stiletto Knife"), 2);
        assert_eq!(table.index_of("M4A1-S"), 3);
        assert_eq!(table.into_names(), ["AK-47", "AWP", "Knife", "M4A1-S"]);
    }

    #[test]
    fn recording_the_same_names_in_another_order_produces_the_same_table() {
        let forwards = sealed(&["AWP", "AK-47", "M4A1-S", "Paracord Knife"]);
        let backwards = sealed(&["Paracord Knife", "M4A1-S", "AK-47", "AWP"]);

        assert_eq!(forwards.index_of("AK-47"), backwards.index_of("AK-47"));
        assert_eq!(forwards.into_names(), backwards.into_names());
    }

    #[test]
    fn every_knife_variant_indexes_the_one_entry() {
        let table = sealed(&["Paracord Knife", "M9 Bayonet", "knife_t", "AK-47"]);

        let knife = table.index_of("Paracord Knife");
        assert_eq!(table.index_of("M9 Bayonet"), knife);
        assert_eq!(table.index_of("knife_t"), knife);
        assert_ne!(table.index_of("AK-47"), knife);
        assert_eq!(table.into_names(), ["AK-47", "Knife"]);
    }

    #[test]
    fn a_name_the_match_never_carried_reads_as_nothing() {
        assert_eq!(sealed(&["AK-47"]).index_of("Negev"), WEAPON_NONE);
    }

    /// `WEAPON_NONE` is a legitimate index away from being a bug: the table must refuse the 256th
    /// distinct name rather than hand out an index that means "nothing".
    #[test]
    fn the_table_refuses_to_grow_into_the_none_sentinel() {
        let names: Vec<String> = (0..300).map(|index| format!("weapon {index:04}")).collect();
        let table = sealed(&names.iter().map(String::as_str).collect::<Vec<_>>());

        assert_eq!(table.into_names().len(), usize::from(WEAPON_NONE));
    }

    #[test]
    fn an_inventory_becomes_one_bit_per_kind_of_utility() {
        assert_eq!(grenades_of(&[44]), GRENADE_HE);
        assert_eq!(grenades_of(&[45]), GRENADE_SMOKE);
        assert_eq!(grenades_of(&[47]), GRENADE_DECOY);
        assert_eq!(grenades_of(&[55]), GRENADE_DEFUSE_KIT);
        assert_eq!(grenades_of(&[]), 0);
    }

    #[test]
    fn a_molotov_and_an_incendiary_are_the_same_bit() {
        assert_eq!(grenades_of(&[46]), GRENADE_FIRE);
        assert_eq!(grenades_of(&[48]), GRENADE_FIRE);
        assert_eq!(grenades_of(&[46, 48]), GRENADE_FIRE);
    }

    #[test]
    fn a_second_flashbang_arrives_as_a_repeated_index_and_takes_the_second_bit() {
        assert_eq!(grenades_of(&[43]), GRENADE_FLASH);
        assert_eq!(grenades_of(&[43, 43]), GRENADE_FLASH | GRENADE_FLASH_SECOND);
    }

    #[test]
    fn a_weapon_in_the_inventory_sets_no_utility_bit() {
        assert_eq!(grenades_of(&[7, 9, 60, 42]), 0);
        assert_eq!(grenades_of(&[7, 44, 9]), GRENADE_HE);
    }
}
