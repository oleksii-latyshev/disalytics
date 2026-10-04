//! The engine's own words for things, translated into the schema's. Game vocabulary is canonical
//! and never localised — `CODE_REQUIREMENTS.md` §10 — so these are identifiers, not copy.

use crate::schema::{BuyType, HitGroup, RoundWinReason, Team};

/// Per-player equipment value at freeze-time end. The ladder is a review aid, not a rule the game
/// enforces — it exists so a round can be labelled without the viewer adding up loadouts.
const ECO_CEILING: i32 = 2_000;
const FORCE_BUY_CEILING: i32 = 3_500;
const SEMI_BUY_CEILING: i32 = 4_750;

pub(crate) fn team_of(winner: &str) -> Option<Team> {
    match winner {
        "CT" => Some(Team::Ct),
        "T" => Some(Team::T),
        _ => None,
    }
}

pub(crate) fn reason_of(reason: &str) -> RoundWinReason {
    match reason {
        "ct_killed" => RoundWinReason::AllCtEliminated,
        "t_killed" => RoundWinReason::AllTEliminated,
        "bomb_defused" => RoundWinReason::BombDefused,
        "bomb_exploded" => RoundWinReason::BombExploded,
        "time_ran_out" => RoundWinReason::TimeExpired,
        _ => RoundWinReason::Draw,
    }
}

/// What `Kill::weapon` and `Damage::weapon` can say for a weapon someone holds, in the game's
/// internal vocabulary. Mirrors `WEAPON_IDS` in `packages/demo-core/src/schema.ts`; `weapons:check`
/// holds the two together, in order.
///
/// Read off 7 FACEIT demos and the Phase 0 fixture (#53). Never observed in any recording, kept
/// because the game has them: `bizon`, `mp5sd`, `p90`, `g3sg1`, `sawedoff`, `m249`.
pub(crate) const WEAPON_IDS: &[&str] = &[
    "cz75a",
    "deagle",
    "elite",
    "fiveseven",
    "glock",
    "hkp2000",
    "p250",
    "revolver",
    "tec9",
    "usp_silencer",
    "bizon",
    "mac10",
    "mp5sd",
    "mp7",
    "mp9",
    "p90",
    "ump45",
    "ak47",
    "aug",
    "famas",
    "galilar",
    "m4a1",
    "m4a1_silencer",
    "sg556",
    "awp",
    "g3sg1",
    "scar20",
    "ssg08",
    "mag7",
    "nova",
    "sawedoff",
    "xm1014",
    "m249",
    "negev",
    "knife",
    "taser",
    "c4",
    "decoy",
    "flashbang",
    "hegrenade",
    "incgrenade",
    "molotov",
    "smokegrenade",
];

/// Damage that is not a weapon anyone holds. `inferno` is the burning area a molotov or incendiary
/// leaves; `unknown` is what anything outside both lists becomes, so a future demo degrades rather
/// than failing the parse. Mirrors `DAMAGE_SOURCES` in `packages/demo-core/src/schema.ts`.
pub(crate) const DAMAGE_SOURCES: &[&str] = &["inferno", "planted_c4", "world", "unknown"];

const WORLD: &str = "world";
const UNKNOWN: &str = "unknown";
const KNIFE: &str = "knife";

/// The canonical id for what the game event named: every knife skin and `bayonet` is `knife`, a
/// `*_off` variant (silencer detached) is its base weapon, and the empty string — which is how the
/// world reports itself — is `world`. Anything else is `unknown`, never an error.
pub(crate) fn weapon_id_of(raw: &str) -> &'static str {
    if raw.is_empty() {
        return WORLD;
    }
    if raw.starts_with("knife") || raw == "bayonet" {
        return KNIFE;
    }
    let base = raw.strip_suffix("_off").unwrap_or(raw);
    WEAPON_IDS
        .iter()
        .chain(DAMAGE_SOURCES)
        .find(|known| **known == base)
        .copied()
        .unwrap_or(UNKNOWN)
}

/// Knife and world kills report `-1` here rather than a name, which is what the catch-all covers.
pub(crate) fn hit_group_of(hit_group: &str) -> HitGroup {
    match hit_group {
        "head" => HitGroup::Head,
        "chest" => HitGroup::Chest,
        "stomach" => HitGroup::Stomach,
        "left_arm" => HitGroup::LeftArm,
        "right_arm" => HitGroup::RightArm,
        "left_leg" => HitGroup::LeftLeg,
        "right_leg" => HitGroup::RightLeg,
        "neck" => HitGroup::Neck,
        "gear" => HitGroup::Gear,
        _ => HitGroup::Generic,
    }
}

/// A half start is only a pistol round when the players are on pistol-round money: overtime halves
/// also swap sides, and both of them open with a full buy.
pub(crate) const fn buy_type_of(equipment_value: i32, is_half_start: bool) -> BuyType {
    if is_half_start && equipment_value < ECO_CEILING {
        return BuyType::Pistol;
    }
    if equipment_value < ECO_CEILING {
        BuyType::Eco
    } else if equipment_value < FORCE_BUY_CEILING {
        BuyType::ForceBuy
    } else if equipment_value < SEMI_BUY_CEILING {
        BuyType::SemiBuy
    } else {
        BuyType::FullBuy
    }
}

#[cfg(test)]
mod tests {
    use super::{
        DAMAGE_SOURCES, WEAPON_IDS, buy_type_of, hit_group_of, reason_of, team_of, weapon_id_of,
    };
    use crate::schema::{BuyType, HitGroup, RoundWinReason, Team};

    #[test]
    fn every_win_reason_the_engine_names_maps_to_one_of_ours() {
        assert_eq!(reason_of("ct_killed"), RoundWinReason::AllCtEliminated);
        assert_eq!(reason_of("t_killed"), RoundWinReason::AllTEliminated);
        assert_eq!(reason_of("bomb_defused"), RoundWinReason::BombDefused);
        assert_eq!(reason_of("bomb_exploded"), RoundWinReason::BombExploded);
        assert_eq!(reason_of("time_ran_out"), RoundWinReason::TimeExpired);
    }

    #[test]
    fn an_unknown_win_reason_is_a_draw_rather_than_a_panic() {
        assert_eq!(reason_of("something_new"), RoundWinReason::Draw);
        assert_eq!(reason_of(""), RoundWinReason::Draw);
    }

    #[test]
    fn the_winner_is_only_ever_one_of_the_two_sides() {
        assert_eq!(team_of("CT"), Some(Team::Ct));
        assert_eq!(team_of("T"), Some(Team::T));
        assert_eq!(team_of("Draw"), None);
    }

    #[test]
    fn hitgroups_arrive_with_underscores_and_leave_kebab_cased() {
        assert_eq!(hit_group_of("left_arm"), HitGroup::LeftArm);
        assert_eq!(hit_group_of("right_leg"), HitGroup::RightLeg);
        assert_eq!(hit_group_of("head"), HitGroup::Head);
    }

    #[test]
    fn the_numeric_hitgroup_a_knife_kill_reports_is_generic() {
        assert_eq!(hit_group_of("-1"), HitGroup::Generic);
        assert_eq!(hit_group_of("generic"), HitGroup::Generic);
    }

    #[test]
    fn the_first_round_of_a_half_is_a_pistol_round() {
        assert_eq!(buy_type_of(0, true), BuyType::Pistol);
        assert_eq!(buy_type_of(900, true), BuyType::Pistol);
    }

    #[test]
    fn an_overtime_half_swaps_sides_on_full_buys_and_is_not_a_pistol_round() {
        assert_eq!(buy_type_of(5_100, true), BuyType::FullBuy);
        assert_eq!(buy_type_of(3_600, true), BuyType::SemiBuy);
    }

    #[test]
    fn the_buy_ladder_runs_from_eco_to_full() {
        assert_eq!(buy_type_of(0, false), BuyType::Eco);
        assert_eq!(buy_type_of(1_999, false), BuyType::Eco);
        assert_eq!(buy_type_of(2_000, false), BuyType::ForceBuy);
        assert_eq!(buy_type_of(3_499, false), BuyType::ForceBuy);
        assert_eq!(buy_type_of(3_500, false), BuyType::SemiBuy);
        assert_eq!(buy_type_of(4_749, false), BuyType::SemiBuy);
        assert_eq!(buy_type_of(4_750, false), BuyType::FullBuy);
    }

    #[test]
    fn every_knife_skin_and_the_bayonet_are_the_knife() {
        for raw in [
            "knife",
            "knife_t",
            "knife_cord",
            "knife_m9_bayonet",
            "knife_kukri",
            "bayonet",
        ] {
            assert_eq!(weapon_id_of(raw), "knife", "{raw}");
        }
    }

    #[test]
    fn a_detached_silencer_is_the_base_weapon() {
        assert_eq!(weapon_id_of("m4a1_silencer_off"), "m4a1_silencer");
        assert_eq!(weapon_id_of("usp_silencer_off"), "usp_silencer");
    }

    #[test]
    fn the_world_reports_itself_as_an_empty_string() {
        assert_eq!(weapon_id_of(""), "world");
        assert_eq!(weapon_id_of("world"), "world");
    }

    #[test]
    fn damage_that_is_not_a_weapon_keeps_its_own_name() {
        assert_eq!(weapon_id_of("inferno"), "inferno");
        assert_eq!(weapon_id_of("planted_c4"), "planted_c4");
    }

    #[test]
    fn a_weapon_nobody_listed_is_unknown_rather_than_an_error() {
        assert_eq!(weapon_id_of("portalgun"), "unknown");
        assert_eq!(weapon_id_of("AK-47"), "unknown");
        assert_eq!(weapon_id_of("weapon_ak47"), "unknown");
    }

    #[test]
    fn every_listed_id_is_its_own_canonical_form_and_appears_once() {
        for id in WEAPON_IDS.iter().chain(DAMAGE_SOURCES) {
            assert_eq!(weapon_id_of(id), *id);
        }
        let mut seen: Vec<&str> = WEAPON_IDS.iter().chain(DAMAGE_SOURCES).copied().collect();
        seen.sort_unstable();
        seen.dedup();
        assert_eq!(seen.len(), WEAPON_IDS.len() + DAMAGE_SOURCES.len());
    }
}
